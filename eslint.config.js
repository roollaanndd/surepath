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
    // ── Guardrail: the design-system primitives stay token-only ──────────────
    //
    // The audit on 2026-10-23 counted 1.017 hardcoded hex values across 91
    // files. They cannot all be removed at once, but `components/ui/` is the
    // layer every portal is supposed to inherit from, and it is hex-free as of
    // this commit — so it is locked here before it drifts again. Colours belong
    // in styles.css as `--ds-*` tokens; a third-party brand colour that cannot
    // follow the theme (WhatsApp green) is still declared there as a token.
    //
    // The rest of the codebase is not covered yet. Widen this `files` list one
    // directory at a time as each is cleaned, rather than turning it on
    // everywhere and drowning the warning count.
    files: ['components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: 'Literal[value=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b/]',
          message: 'Jangan tulis warna hex di components/ui/ — pakai token ds-* dari styles.css. Primitif ini dipakai enam portal, dan hex di sini tidak ikut berganti saat dark mode.',
        },
        {
          selector: 'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b/]',
          message: 'Jangan tulis warna hex di components/ui/ — pakai token ds-* dari styles.css. Primitif ini dipakai enam portal, dan hex di sini tidak ikut berganti saat dark mode.',
        },
      ],
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
