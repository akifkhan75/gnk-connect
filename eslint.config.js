import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/build/**', '**/.turbo/**', 'apps/mobile/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: ['apps/api/**/*.ts', '**/*.mjs', '**/*.cjs', 'scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: [
      'apps/portal/**/*.{ts,tsx}',
      'apps/admin/**/*.{ts,tsx}',
      'apps/website/**/*.{ts,tsx}',
      'packages/ui/**/*.{ts,tsx}',
    ],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // CLI scripts, seeds and smoke tests print to the console by design.
    files: ['**/*.mjs', 'scripts/**', 'apps/api/prisma/**', 'apps/api/test/**'],
    rules: { 'no-console': 'off' },
  },
);
