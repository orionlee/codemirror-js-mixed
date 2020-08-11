[![NPM version](https://img.shields.io/npm/v/codemirror-js-mixed?color=blue)](https://www.npmjs.com/package/codemirror-js-mixed)

# Javascript-mixed mode for CodeMirror

A language mode for [CodeMirror](https://codemirror.net/), support highlighting HTML/CSS in javascript codes.

## Features
- Detects and highlights HTML in strings / template strings. (for strings begin with a tag)
    - HTML, highlights inner CSS / Javascript as well, e.g., highlights CSS for the text in `<style>` tags.
- Highlights CSS for userscript's `GM_addStyle()`
- Highlights arbitrary template strings as HTML / CSS by prepending an inline `/*html*/` and `/*css*/` hint respectively.

## Installation
