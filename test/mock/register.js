require('@babel/register');

// emulate browser env for codemirror.js
const { JSDOM } = require('jsdom');
const domProps = Object.getOwnPropertyDescriptors(new JSDOM('').window);
Object.defineProperties(global, domProps);
