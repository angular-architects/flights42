// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const sheriff = require('@softarc/eslint-plugin-sheriff');

//
//  Some rules are deactivated for the labs
//

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      // eslint.configs.recommended,
      // tseslint.configs.recommended,
      // tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'off',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  // {
  //   plugins: {
  //     'simple-import-sort': simpleImportSort,
  //   },
  //   rules: {
  //     'simple-import-sort/imports': 'error',
  //     'simple-import-sort/exports': 'error',
  //   },
  // },
  {
    files: ['**/*.ts'],
    extends: [sheriff.configs.all],
  },
]);
