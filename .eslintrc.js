module.exports = {
  root: true,
  extends: [
    "eslint:recommended"
  ],
  parserOptions: {
    "ecmaVersion": 2018,
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
  "env": {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    // copied from airbnb-base, replaced 4 with 8
    'object-curly-newline': ['error', {
      ObjectExpression: { minProperties: 8, multiline: true, consistent: true },
      ObjectPattern: { minProperties: 8, multiline: true, consistent: true },
      ImportDeclaration: { minProperties: 8, multiline: true, consistent: true },
      ExportDeclaration: { minProperties: 8, multiline: true, consistent: true },
    }],
  },
};
