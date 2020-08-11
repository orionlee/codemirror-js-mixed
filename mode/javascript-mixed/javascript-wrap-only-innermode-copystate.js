// Javascript mode for CodeMirror
// Distributed under an MIT license

// Simply forward the calls to underlying javascript mode
// - added innermode / copystate helpers to the returned object to emulate mixed mode behavior
// used to see the overhead incurs in such calls
// add helpers needed for mixed mode

/* eslint func-names: "off" */
/* eslint-disable no-unused-vars */ // temporary in this branch
/* eslint-disable quotes */
(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    // eslint-disable-next-line global-require
    mod(require('codemirror/lib/codemirror'), require('codemirror/mode/javascript/javascript'));
  // eslint-disable-next-line no-undef
  } else if (typeof define === 'function' && define.amd) { // AMD
    // eslint-disable-next-line no-undef
    define(['codemirror/lib/codemirror', 'codemirror/mode/javascript/javascript'], mod);
  } else { // Plain browser env
    // eslint-disable-next-line no-undef
    mod(CodeMirror);
  }
}((CodeMirror) => {
  CodeMirror.defineMode('javascript-wrap-only-innermode-copystate', (config, parserConfig) => {
    const jsonMode = false;

    const jsMode = CodeMirror.getMode(config, { name: 'javascript' });

    return {
      startState(basecolumn) {
        return jsMode.startState(basecolumn);
      },

      token(stream, state) {
        return jsMode.token(stream, state);
      },

      indent(state, textAfter) {
        return jsMode.indent(state, textAfter);
      },

      // BEGIN not in original javascript.js, added to emulate mixed mode API

      // copyState(state) { // it made no differences
      //   return CodeMirror.copyState(jsMode, state);
      // },

      innerMode(state) {
        // eslint-disable-next-line object-shorthand
        return { state: state, mode: jsMode };
      },

      // END not in original javascript.js, added to emulate mixed mode API

      electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
      blockCommentStart: jsonMode ? null : "/*",
      blockCommentEnd: jsonMode ? null : "*/",
      blockCommentContinue: jsonMode ? null : " * ",
      lineComment: jsonMode ? null : "//",
      fold: "brace",
      closeBrackets: "()[]{}''\"\"``",

    };
  }, 'javascript');
}));
