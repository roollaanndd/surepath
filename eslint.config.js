// ESLint flat config (v9+ format)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Only enforce the two critical hooks rules — turn off the new
      // React Compiler rules (too strict for this codebase, would require
      // a full rewrite to satisfy).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Turn off noisy rules that have too many existing violations
      'no-useless-assignment': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-binary-expression': 'off',
    },
  },
  {
    ignores: [
      // build-server/ berisi bundel CJS hasil esbuild (var/require/process) —
      // keluaran build, bukan sumber. Dipindahkan ke sini dari dist/ di v2.5.5
      // supaya tidak ikut terpublikasi ke internet.
      'dist/', 'build-server/', 'node_modules/', 'supabase/functions/',
      // ECC and other AI tooling are generated local developer resources, not app source.
      '.agents/**', '.claude/**', '.memory/**',
      '*.cjs', '*.js', 'server.ts', 'scripts/',
      'android/', 'public/',
      'eslint.config.js',
    ],
  },
);
