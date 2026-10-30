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

// An inline `style={{ fontSize: '0.44rem' }}` is the same defect as
// `text-[7px]`, and the class-name selectors above cannot see it. 38 of these
// were found in 13 files AFTER v2.6.13 shipped — including the three portal
// login gates at 0.42rem (6.72px) and four public marketing pages that pass
// had already been claimed as migrated. The floor is 0.6875rem (11px), the
// same number `text-2xs` resolves to.
const INLINE_TINY_MESSAGE =
  'fontSize inline di bawah 11px. Lantai tipografi app adalah 11px — pakai class text-2xs, atau 0.6875rem kalau memang harus inline style.';

const NO_TINY_TEXT_INLINE_ONLY = [
  {
    selector: "Property[key.name='fontSize'] > Literal[value=/^(?:0?\\.(?:[0-5][0-9]?|6[0-8]?)rem|(?:[0-9]|10)px)$/]",
    message: INLINE_TINY_MESSAGE,
  },
];

const NO_TINY_TEXT = [
  { selector: 'Literal[value=/text-\\[(?:[0-9]|10)px\\]/]', message: TINY_TEXT_MESSAGE },
  { selector: 'TemplateElement[value.raw=/text-\\[(?:[0-9]|10)px\\]/]', message: TINY_TEXT_MESSAGE },
  // The same class written in rem. 408 of these were found repo-wide after
  // v2.6.13 shipped, four of them inside components/ui/ — the directory that
  // pass had declared clean and locked. `text-badge` is the one sanctioned
  // sub-11px size, defined in tailwind.config.cjs, so it is not an arbitrary
  // value and this selector never sees it.
  { selector: 'Literal[value=/text-\\[0?\\.(?:[0-5][0-9]?|6[0-8]?)rem\\]/]', message: TINY_TEXT_MESSAGE },
  { selector: 'TemplateElement[value.raw=/text-\\[0?\\.(?:[0-5][0-9]?|6[0-8]?)rem\\]/]', message: TINY_TEXT_MESSAGE },
  {
    selector: "Property[key.name='fontSize'] > Literal[value=/^(?:0?\\.(?:[0-5][0-9]?|6[0-8]?)rem|(?:[0-9]|10)px)$/]",
    message: INLINE_TINY_MESSAGE,
  },
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
      // Added once cleaned, which is how this ratchet is meant to widen.
      'components/TermsModal.tsx',
      // The sign-in screen every Customer and Agent passes through.
      'components/AuthGate.tsx',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...NO_TINY_TEXT],
    },
  },
  {
    // ─── Admin, Operator, Insurer: the inline rule only, deliberately ───────
    //
    // These three are clean of inline sub-11px fontSize as of this commit — the
    // login gates included, which is where the app's smallest type lived — so
    // that half is locked. They still hold ~219 `text-[0.XXrem]` classes on
    // screens that need a real login to see; raising them unseen is how labels
    // get clipped in production, so they wait for a pass with eyes on them.
    // This is a block of its own rather than entries in the list above because
    // flat config REPLACES this rule when two blocks match one file.
    files: [
      'components/admin/**/*.{ts,tsx}',
      'components/operator/**/*.{ts,tsx}',
      'components/insurer/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...NO_TINY_TEXT_INLINE_ONLY],
    },
  },
  {
    ignores: [
      // build-server/ berisi bundel CJS hasil esbuild (var/require/process) —
      // keluaran build, bukan sumber. Dipindahkan ke sini dari dist/ di v2.5.5
      // supaya tidak ikut terpublikasi ke internet.
      'dist/', 'build-server/', 'node_modules/', 'supabase/functions/',
      // design-proposals/ adalah artefak HTML/JS mockup desain (di-preview di
      // browser, bukan source yang dibundle). Aturan no-undef Node tidak
      // relevan di sana — dirujuk design.md sebagai target eksekusi migrasi.
      'design-proposals/**',
      // ECC and other AI tooling are generated local developer resources, not app source.
      '.agents/**', '.claude/**', '.memory/**',
      '*.cjs', '*.js', 'server.ts', 'scripts/',
      'android/', 'public/',
      'eslint.config.js',
    ],
  },
);
