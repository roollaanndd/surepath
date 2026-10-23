// ESLint flat config (v9+ format)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// ─── Shared guardrail selectors ──────────────────────────────────────────────
//
// `no-restricted-syntax` is replaced, not merged, when two flat-config blocks
// both set it for the same file. `components/ui/**` matches both guardrails
// below, so they are composed here and spread into each block — otherwise the
// second block would silently switch the first one off for that directory.
const HEX_MESSAGE =
  'Jangan tulis warna hex di components/ui/ — pakai token ds-* dari styles.css. Primitif ini dipakai enam portal, dan hex di sini tidak ikut berganti saat dark mode.';
const TINY_TEXT_MESSAGE =
  'Teks di bawah 11px tidak nyaman dibaca di ponsel. Pakai text-2xs (11px) — lantai tipografi app, didefinisikan sekali di tailwind.config.cjs.';

const NO_HEX = [
  { selector: 'Literal[value=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b/]', message: HEX_MESSAGE },
  { selector: 'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b/]', message: HEX_MESSAGE },
];

const NO_TINY_TEXT = [
  { selector: 'Literal[value=/text-\\[(?:[0-9]|10)px\\]/]', message: TINY_TEXT_MESSAGE },
  { selector: 'TemplateElement[value.raw=/text-\\[(?:[0-9]|10)px\\]/]', message: TINY_TEXT_MESSAGE },
];

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
      'no-restricted-syntax': ['error', ...NO_HEX, ...NO_TINY_TEXT],
    },
  },
  {
    // ─── Typography floor ────────────────────────────────────────────────────
    //
    // 765 text nodes across the app were set below 11px with arbitrary values
    // (text-[10px] down to text-[7px]) — under what is comfortably readable on
    // a phone, and impossible to move in one place because every one of them
    // writes its own number.
    //
    // `text-2xs` (11px, tailwind.config.cjs) is that one place. This rule keeps
    // the directories already migrated from drifting back. It is deliberately
    // NOT repo-wide: the portals still hold ~725 of these and turning it on
    // everywhere would bury the error list. Add a directory here as each one is
    // migrated — same ratchet as the hex rule above.
    //
    // The carve-out is numerals inside fixed-size count badges, which are
    // glyphs in a shape rather than text to read. None of them live in these
    // directories; when the portals migrate, they need their own primitive, not
    // an exemption comment.
    // `components/ui/**` is covered by the block above, which carries this
    // guardrail too — listing it here as well would switch the hex rule off
    // for it.
    files: [
      'src/**/*.{ts,tsx}',
      'components/landing/**/*.{ts,tsx}',
      'components/public/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...NO_TINY_TEXT],
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
