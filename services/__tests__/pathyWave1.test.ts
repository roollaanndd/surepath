// Guard for the Pathy wave-1 pass (v2.7.49 owner-approved scope):
//   1. Mascot moods — PathyFace renders idle / listening / thinking / speaking,
//      and the new mood animations collapse under prefers-reduced-motion.
//   2. Time-aware greeting — the opening line follows the day part instead of
//      being one static string.
//   3. Hands-free conversation loop — after Pathy answers, the mic reopens by
//      itself while the mode is on; it stops with the panel and on failure.
//      speech.ts gains an onEnd hook so the loop can wait for TTS to finish
//      instead of listening to Pathy's own voice.
//   4. Richer service cards — claim status carries a stage tracker, the
//      payment CTA is a full-width action, renewals carry an urgency accent.
//
// Source-level assertions, same style as portalDarkGuard: these lock shapes
// that a refactor must keep, not implementation details for their own sake.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const chat = readFileSync(join(ROOT, 'components/shared/PathyChat.tsx'), 'utf8');
const speech = readFileSync(join(ROOT, 'services/speech.ts'), 'utf8');

describe('Pathy mascot moods', () => {
  it('PathyFace accepts a mood prop covering all four states', () => {
    expect(chat).toMatch(/export type PathyMood = 'idle' \| 'listening' \| 'thinking' \| 'speaking'/);
    expect(chat).toMatch(/mood\?:\s*PathyMood/);
    expect(chat).toContain("mood === 'listening'");
    expect(chat).toContain("mood === 'thinking'");
    expect(chat).toContain("mood === 'speaking'");
  });

  it('the chat derives the mood from listening/loading/speaking state', () => {
    expect(chat).toMatch(/mood[^\n]*=\s*listening/);
    expect(chat).toMatch(/'thinking'/);
  });

  it('new mood animations collapse under prefers-reduced-motion', () => {
    const block = chat.slice(chat.indexOf('@keyframes pathy-listen'), chat.indexOf('@keyframes pathy-listen') + 900);
    expect(block).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('time-aware greeting', () => {
  it('greets by day part, reusing the shared dayPartOf helper', () => {
    expect(chat).toContain('dayPartOf');
    expect(chat).toMatch(/salutation/);
    expect(chat).toMatch(/'Selamat pagi'/);
    expect(chat).toMatch(/'Good morning'/);
  });
});

describe('hands-free conversation loop', () => {
  it('speakAnswer takes an onEnd callback so the loop waits for TTS', () => {
    expect(speech).toMatch(/onEnd\?:\s*\(\)\s*=>\s*void/);
    expect(chat).toMatch(/speakAnswer\(([^)]*),\s*\(\)\s*=>/);
  });

  it('auto-reopens the mic only while the loop is on', () => {
    expect(chat).toContain('voiceLoopRef');
    expect(chat).toMatch(/voiceLoopRef\.current/);
  });

  it('the loop stops with the panel and on failure', () => {
    expect(chat).toMatch(/setVoiceLoop\(false\)/);
  });
});

describe('richer service cards', () => {
  it('claim status renders a stage tracker with a known step order', () => {
    expect(chat).toMatch(/CLAIM_STEP_ORDER/);
    expect(chat).toMatch(/stageIndex/);
  });

  it('payment CTA is a full-width action', () => {
    const block = chat.slice(chat.indexOf("case 'payment_help'"), chat.indexOf("case 'payment_help'") + 1800);
    expect(block).toMatch(/w-full/);
  });

  it('renewal rows carry an urgency accent', () => {
    const block = chat.slice(chat.indexOf("case 'renewals'"), chat.indexOf("case 'renewals'") + 1600);
    expect(block).toMatch(/border-l-2/);
  });
});
