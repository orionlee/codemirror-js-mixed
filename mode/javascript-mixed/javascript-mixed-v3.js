// Javascript mixed mode for CodeMirror
// Distributed under an MIT license

// Based on javascript-mixed, but only handles single/doubted html string
/* eslint func-names: "off" */
/* eslint-disable no-unused-vars */ // temporary in this branch
(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    // eslint-disable-next-line global-require
    mod(require('codemirror/lib/codemirror'), require('codemirror/mode/xml/xml'), require('codemirror/mode/javascript/javascript'), require('codemirror/mode/css/css'));
  // eslint-disable-next-line no-undef
  } else if (typeof define === 'function' && define.amd) { // AMD
    // eslint-disable-next-line no-undef
    define(['codemirror/lib/codemirror', 'codemirror/mode/xml/xml', 'codemirror/mode/javascript/javascript', 'codemirror/mode/css/css'], mod);
  } else { // Plain browser env
    // eslint-disable-next-line no-undef
    mod(CodeMirror);
  }
}((CodeMirror) => {
  function dbg(...args) {
    // eslint-disable-next-line no-console
    if (process.env.DEBUG) console.debug(...args);
  }

  CodeMirror.defineMode('javascript-mixed-v3', (config, parserConfig) => {
    const jsMode = CodeMirror.getMode(config, { name: 'javascript' });

    const STYLE_PASS = 'XXX-PASS'; // indicate the css/html matcher does not return  local mode style

    const forceJsModeToQuasi = (() => {
      let tokenQuasi = null;
      function getTokenQuasi(stream) {
        if (tokenQuasi != null) {
          return tokenQuasi;
        }
        // create a new stream of a non-ending (1st line of a multiline)
        // string template to obtain tokenQuasi tokenizer
        const dummyStream = new stream.constructor('`#dummy', 2, {});
        const dummyState = jsMode.startState();
        jsMode.token(dummyStream, dummyState);
        tokenQuasi = dummyState.tokenize;
        return tokenQuasi;
      }

      function _forceJsModeToQuasi(stream, jsState) {
        jsState.tokenize = getTokenQuasi(stream);
      }

      return _forceJsModeToQuasi;
    })();


    function tokenLength(stream) {
      // usage: avoid string creation in call stream.current().length
      return stream.pos - stream.start;
    }

    function prepReparseStringTemplateInLocalMode(modeToUse, stream, state,
      hasBeginBacktick = true) {
      // ---dbg(`Entering local ${modeToUse.name} mode...`);
      if (hasBeginBacktick) {
        // spit out beginning backtick as a token, and leave the rest of the text for local mode parsing
        stream.backUp(tokenLength(stream) - 1);
      } else {
        stream.backUp(tokenLength(stream));
      }

      // workaround needed for 1-line string template,
      // to ensure the ending backtick is parsed correctly.
      forceJsModeToQuasi(stream, state.jsState);

      // switch to local mode for subsequent text
      state.localMode = modeToUse;
      state.localState = CodeMirror.startState(state.localMode);
    }

    function exitLocalModeWithEndBacktick(stream, state) {
      // ---dbg('Exiting local html/css mode...');
      // local mode done, reset
      state.localMode = null;
      state.localState = null;
      // parse the ending JS string template backtick in js mode
      return jsMode.token(stream, state.jsState);
    }

    function tokenInLocalMode(stream, state) { // TODO: rename tokenInLocalModeInStringTemplate
      const style = state.localMode.token(stream, state.localState);
      // ---dbg('  local mode token - ', stream.current(), `[${style}]`);
      return style;
    }

    function prepReparsePlainStringInLocalMode(modeToUse, stream, state) {
      // ---dbg(`Entering local ${modeToUse.name} mode... (plain string)`);
      // // ---dbg(`    ${stream.start}-${stream.pos}:\t${stream.current()}`);
      const oldPos = stream.pos;
      // spit out beginning beginning quote as a token, and leave the rest of the text for local mode parsing
      stream.backUp(tokenLength(stream) - 1);

      // switch to local mode for subsequent text
      state.localMode = modeToUse;
      state.localState = CodeMirror.startState(state.localMode);
      // use end quote position to detect the end of the local html mode
      state.localState.localHtmlPlainStringEndPos = oldPos;
    }

    function exitLocalModeWithEndQuote(stream, state) {
      // ---dbg('Exiting local html/css mode... (plain string)');
      // local mode done, reset
      state.localMode = null;
      state.localState = null;
      // parse the ending JS string quote,
      // cannot use the jsMode to parse, as it will be treated as the beginning of a string.
      // so we simulate it here.
      stream.next(); // should be single or double quote;
      return 'string'; // the expected style
    }

    function tokenInLocalModePlainString(stream, state) {
      const style = state.localMode.token(stream, state.localState);
      if (stream.pos >= state.localState.localHtmlPlainStringEndPos) {
        // backUp text beyond the string, plus one to exclude end quote
        stream.backUp(stream.pos - state.localState.localHtmlPlainStringEndPos + 1);
      }
      // ---dbg('  local mode token (plain string) - ', stream.current(), `[${style}]`);
      return style;
    }

    const cssMode = CodeMirror.getMode(config, { name: 'css' });

    const htmlMode = CodeMirror.getMode(config, {
      name: 'xml',
      htmlMode: true,
      multilineTagIndentFactor: parserConfig.multilineTagIndentFactor,
      multilineTagIndentPastTag: parserConfig.multilineTagIndentPastTag,
    });

    // for tokenizing plain string, where matchClosing would cause too many false errors
    // as the html often spans across multiple strings.
    const htmlNoMatchClosingMode = CodeMirror.getMode(config, {
      name: 'xml',
      htmlMode: true,
      matchClosing: false,
    });

    const [RE_HTML_BASE, RE_HTML_PLAIN_STRING, RE_HTML_STRING_TEMPLATE] = (() => {
      const reHtmlBaseStr = /\s*<\/?[a-zA-Z0-9]+(\s|\/?>)/.source;
      return [
        new RegExp(reHtmlBaseStr),
        new RegExp(`^['"]${reHtmlBaseStr}`),
        new RegExp(`^[\`]${reHtmlBaseStr}`),
      ];
    })();

    function maybeTokenHtmlPlainString(stream, state, jsTokenStyle) {
      if (stream.start >= state.localState.localHtmlPlainStringEndPos - 1) { // match the expected ending quote by position
        state.maybeTokenize = maybeTokenBase;
        return exitLocalModeWithEndQuote(stream, state);
      }
      // else stay in html mode
      return tokenInLocalModePlainString(stream, state);
    }

    function maybeTokenStringTemplateInLocalMode(stream, state, jsTokenStyle) {
      // tokenize the string template in current local mode (html or css)
      if (stream.peek() === '`') { // if it hits ending backtick for string template
        state.maybeTokenize = maybeTokenBase;
        return exitLocalModeWithEndBacktick(stream, state);
      }
      // else stay in local mode
      return tokenInLocalMode(stream, state);
    }

    function maybeTokenHtmlStringTemplateStarted2ndLine(stream, state, jsTokenStyle) {
      if (state.jsState.lastType === 'quasi' && RE_HTML_BASE.test(stream.current())) { // second line starts with a tag
        state.maybeTokenize = maybeTokenStringTemplateInLocalMode;
        prepReparseStringTemplateInLocalMode(htmlMode, stream, state, false);
        return STYLE_PASS;
      }
      // else not a html-like string template. reset to regular parsing
      state.maybeTokenize = maybeTokenBase;
      return STYLE_PASS;
    }

    function maybeTokenHtmlStringTemplateBegin(stream, state, jsTokenStyle) {
      if (state.jsState.lastType === 'quasi') { // match a string template, should start with a begin backtick
        state.maybeTokenize = maybeTokenStringTemplateInLocalMode;
        prepReparseStringTemplateInLocalMode(htmlMode, stream, state);
        return STYLE_PASS;
      }
      // else not `html-string` pattern. reset to regular parsing
      state.maybeTokenize = maybeTokenBase;
      return STYLE_PASS;
    }

    function maybeTokenCssGMAddStyle1(stream, state, jsTokenStyle) {
      if (state.jsState.lastType === '(' && stream.current() === '(') {
        state.maybeTokenize = maybeTokenCssStringTemplateBegin;
        return STYLE_PASS;
      }
      // else not GM_addStyle(`css-string`) pattern. reset to regular parsing
      state.maybeTokenize = maybeTokenBase;
      return STYLE_PASS;
    }

    function maybeTokenCssStringTemplateBegin(stream, state, jsTokenStyle) {
      if (state.jsState.lastType === 'quasi') { // match a string template, should start with a begin backtick
        state.maybeTokenize = maybeTokenStringTemplateInLocalMode;
        prepReparseStringTemplateInLocalMode(cssMode, stream, state);
        return STYLE_PASS;
      }
      // else not `css-string` pattern. reset to regular parsing
      state.maybeTokenize = maybeTokenBase;
      return STYLE_PASS;
    }

    // Rules set:
    // * html-plain-string :
    //    plain string (single or double quoted) that looks like html
    //    e.g., '<div class="foo">hello', "</div>", '  <hr/>', etc.
    // * html-string-template:
    //    string tempalte that looks like html
    // * html-string-template-2nd-line:
    //    string template that looks like html but started as second line
    //    e.g., someVar = `\
    //          <div>...`;
    // * html-by-hint:
    //    for pattern var someHTML = /* html */ `html-string`
    //
    // * css-gm-addstyle:
    //    for pattern GM_addStyle(`css-string`);
    // * css-by-hint:
    //    for pattern var someCSS = /* css */ `css-string`
    //

    /**
     * Main dispatcher of all local mode pattern matching rules.
     *
     * Each rule started with a match condition in this function, the matching state
     * is dictated by changing state.maybeTokenize (the next matching criteria).
     *
     * Adding / removing rules could be done by following the logic here until it reaches
     * its end: typically a function that would exit the local mode and reset
     * state.maybeTokenize to this function, e.g., maybeTokenHtmlPlainString()
     */
    function maybeTokenBase(stream, state, jsTokenStyle) {
      // TODO: might need to cache stream.current()
      if (state.jsState.lastType === 'string' && RE_HTML_PLAIN_STRING.test(stream.current())) {
        // rule html-plain-string
        state.maybeTokenize = maybeTokenHtmlPlainString;
        prepReparsePlainStringInLocalMode(htmlNoMatchClosingMode, stream, state);
      } else if (state.jsState.lastType === 'quasi' && RE_HTML_STRING_TEMPLATE.test(stream.current())) {
        // rule html-string-template
        state.maybeTokenize = maybeTokenStringTemplateInLocalMode;
        prepReparseStringTemplateInLocalMode(htmlMode, stream, state, true);
      } else if (state.jsState.lastType === 'quasi' && /^[`](\\)?\s*$/.test(stream.current())) { // first line is blank
        // rule html-string-template-2nd-line
        state.maybeTokenize = maybeTokenHtmlStringTemplateStarted2ndLine;
      } else if (state.jsState.lastType === 'variable' && stream.current() === 'GM_addStyle') {
        // rule css-gm-addstyle
        state.maybeTokenize = maybeTokenCssGMAddStyle1;
      } else if (jsTokenStyle === 'comment' && /^\/\*\s*css\s*\*\/$/i.test(stream.current())) {
        // rule css-by-hint
        state.maybeTokenize = maybeTokenCssStringTemplateBegin;
      } else if (jsTokenStyle === 'comment' && /^\/\*\s*html\s*\*\/$/i.test(stream.current())) {
        // rule html-by-hint
        state.maybeTokenize = maybeTokenHtmlStringTemplateBegin;
      }
      // else no match, no-op

      return STYLE_PASS;
    }

    function jsToken(stream, state) {
      // // ---dbg('jsToken -', `${stream.pos}: ${stream.string.substring(stream.pos).substring(0, 8)}`, state.lastType);

      // adapt the existing jsmode tokenizer with the wrapper state
      let tokenStyle = null;
      if (!state.localMode) {
        // when in local html/css context, skip js parsing,
        // so as not to mess up js tokenizer's state.
        tokenStyle = jsMode.token(stream, state.jsState);
        // // --dbg('jsMode.token - ', state.maybeTokenize.name, state.jsState.lastType, stream.current(), `[${tokenStyle}]`);
        if (tokenStyle === null) { // case the token is not relevant semantically, e.g., space or line break;
          // just return,  skip local mode match,
          // as such token is not reflected in stream/state so the local mode matcher
          // will end up seeing previous token.
          return null;
        }
      }

      // match to see if it needs to switch to local html mode, return local mode style if applicable
      const maybeLocalStyle = state.maybeTokenize(stream, state, tokenStyle);
      if (maybeLocalStyle !== STYLE_PASS) {
        tokenStyle = maybeLocalStyle;
      }

      return tokenStyle;
    }

    return {
      startState() {
        const state = CodeMirror.startState(jsMode);
        return {
          token: jsToken,
          localMode: null,
          localState: null,
          maybeTokenize: maybeTokenBase,
          jsState: state,
        };
      },

      copyState(state) {
        const local = (state.localState)
          ? CodeMirror.copyState(state.localMode, state.localState) : null;
        return {
          token: state.token,
          localMode: state.localMode,
          localState: local,
          maybeTokenize: state.maybeTokenize,
          jsState: CodeMirror.copyState(jsMode, state.jsState),
        };
      },

      token(stream, state) {
        // // ---dbg(`${stream.pos}: ${stream.string.substring(stream.pos).substring(0, 15)}`, state.lastType);
        const tokenStyle = state.token(stream, state); // TODO: state.token is unncessary always jsToken

        // ---dbg('   <--', `[${tokenStyle}]`, stream.current());
        return tokenStyle;
      },

      indent(state, textAfter, line) {
        // ---dbg(`indent: "${textAfter}" "${line}"`);
        if (!state.localMode) {
          return jsMode.indent(state.jsState, textAfter, line);
        }
        if (state.localMode.indent) {
          return state.localMode.indent(state.localState, textAfter, line);
        }
        return CodeMirror.Pass;
      },

      innerMode(state) {
        return { state: state.localState || state.jsState, mode: state.localMode || jsMode };
      },
    };
  }, 'javascript', 'xml', 'css');
}));
