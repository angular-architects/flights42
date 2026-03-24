// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const sheriff = require('@softarc/eslint-plugin-sheriff');
const nx = require('@nx/eslint-plugin');

module.exports = defineConfig([
  {
    plugins: { '@nx': nx },
  },
  {
    files: ['**/*.ts'],
    extends: [
      //
      // Some linting rules are disabled for the labs to
      // keep the focus on the learning goals.
      //
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
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          depConstraints: [
            {
              sourceTag: 'domain:flights',
              onlyDependOnLibsWithTags: ['domain:flights', 'domain:shared'],
            },
            {
              sourceTag: 'domain:miles',
              onlyDependOnLibsWithTags: ['domain:miles', 'domain:shared'],
            },
            {
              sourceTag: 'domain:shared',
              onlyDependOnLibsWithTags: ['domain:shared'],
            },
            {
              sourceTag: 'domain:luggage',
              onlyDependOnLibsWithTags: ['domain:luggage', 'domain:shared'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:ui', 'type:data', 'type:util'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:data', 'type:util'],
            },
            {
              sourceTag: 'type:data',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  // {
  //   files: ['**/*.ts'],
  //   extends: [sheriff.configs.all],
  // },
]);
