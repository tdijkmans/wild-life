// ESLint v10 flat config for Angular 22 TypeScript and templates.
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  { ignores: ['dist/**', 'coverage/**', '.angular/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['app', 'ds'], style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
    },
  },
  {
    // Enforce the domain's independence from Angular, presentation and routing.
    files: ['src/app/features/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', '**/rendering/**', '**/components/**', '**/home/**'],
              message: 'Domain code must not depend on Angular or presentation modules.',
            },
          ],
        },
      ],
    },
  },
  {
    // Home is a catalogue-driven view, not an owner of biological or Canvas modules.
    files: ['src/app/features/home/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../*/domain/**',
                '../*/rendering/**',
                '../*/preview/**',
                '../../features/*/domain/**',
                '../../features/*/rendering/**',
                '../../features/*/preview/**',
              ],
              message: 'Home must use the simulation catalogue and lazy preview contract.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [...angular.configs.templateRecommended],
  },
);
