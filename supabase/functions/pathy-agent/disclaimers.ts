// ─────────────────────────────────────────────────────────────────────────────
// Pathy's honesty layer.
//
// Two rules the business cares about more than anything Pathy says:
//
//   1. Pathy never decides liability. Whether a claim is paid, and how much,
//      is the insurer's decision after survey and file review. Pathy reads the
//      policy and says what it *indicates* — a very different sentence, and
//      the one that does not create a promise SurePath cannot keep.
//   2. Pathy says out loud that it can be wrong, and who the real authority
//      is: insurer for cover and claims, a doctor for anything medical, OJK /
//      Samsat / a lawyer for regulatory and legal points.
//
// The model is *asked* to do this in the system prompt, but a prompt is a
// request, not a guarantee. So the disclaimer for a turn is also computed here
// from the tools that actually ran and the words that actually came back, and
// the client renders it under the bubble whether the model cooperated or not.
// ─────────────────────────────────────────────────────────────────────────────

export type DisclaimerTopic = 'CLAIM' | 'COVERAGE' | 'PRICE' | 'MEDICAL' | 'LEGAL' | 'GENERAL';

/** Pathy is an assistant, not an underwriter. Always present. */
export const AI_DISCLAIMER =
  'Aku AI — jawabanku bisa keliru, jadi tolong dicek ulang sebelum dipakai untuk keputusan penting.';

/** Cover, liability and claim outcomes belong to the insurer, full stop. */
export const INSURER_AUTHORITY =
  'Keputusan dijamin atau tidaknya sebuah klaim sepenuhnya ada pada pihak asuransi setelah survei dan pemeriksaan berkas — aku hanya membaca data polismu.';

/** Anything touching injury, health or treatment. */
export const MEDICAL_AUTHORITY =
  'Untuk hal medis, yang berwenang adalah dokter atau tenaga kesehatan — aku tidak memberi diagnosis atau saran pengobatan.';

/** Regulation, tax, police reports, legal fault. */
export const LEGAL_AUTHORITY =
  'Untuk hal hukum atau regulasi, mohon rujuk ke pihak berwenang (OJK, kepolisian, atau penasihat hukum).';

/** Every rupiah Pathy shows is indicative until underwriting says otherwise. */
export const PRICE_DISCLAIMER =
  'Angka premi bersifat estimasi berdasarkan tarif OJK; premi final ditentukan insurer setelah underwriting.';

/**
 * Shown on every coverage / claim card. Kept short because it sits under a
 * card that already carries the numbers.
 */
export const COVERAGE_DISCLAIMER =
  'Ini pembacaan indikatif dari data polismu, bukan keputusan. Keputusan akhir ada pada insurer setelah survei dan pemeriksaan berkas.';

/**
 * The only three answers Pathy may give about cover. Note that none of them is
 * a decision — that is the whole point.
 */
export type Indication = 'LIKELY_COVERED' | 'LIKELY_NOT_COVERED' | 'NEEDS_REVIEW';

export const INDICATION_LABEL: Record<Indication, string> = {
  LIKELY_COVERED: 'Indikasi: kemungkinan besar dijamin',
  LIKELY_NOT_COVERED: 'Indikasi: kemungkinan besar tidak dijamin',
  NEEDS_REVIEW: 'Indikasi: perlu ditinjau insurer',
};

// Matching is on the model's own reply plus the tools that ran. Deliberately
// broad: a disclaimer shown once too often costs nothing, a missing one on a
// claim answer costs a complaint.
const CLAIM_WORDS = /\b(klaim|claim|ganti\s?rugi|santunan|liable|liabilit|tanggung\s?jawab|ditolak|disetujui|reject|approve)/i;
const COVERAGE_WORDS = /\b(ditanggung|dijamin|jaminan|cover|coverage|pertanggungan|dikecualikan|exclusion|perluasan)/i;
const PRICE_WORDS = /\b(premi|premium|tarif|rate|harga|biaya|rp\s?\d|diskon)/i;
const MEDICAL_WORDS = /\b(dokter|medis|medical|rumah\s?sakit|cedera|luka|sakit|diagnos|obat|rawat|opname|terapi|kesehatan)/i;
const LEGAL_WORDS = /\b(hukum|legal|pengadilan|polisi|kepolisian|pidana|perdata|undang-undang|pasal|ojk|pajak|samsat|denda)/i;

const CLAIM_TOOLS = new Set(['start_claim', 'claim_status', 'get_my_claims']);
const COVERAGE_TOOLS = new Set(['check_coverage', 'explain_my_policy', 'get_policy_detail']);
const PRICE_TOOLS = new Set(['estimate_premium', 'compare_offers', 'build_quotation', 'create_quote', 'renewal_check']);

/**
 * Which authorities this turn has to name. Order is significance, not
 * frequency: a claim answer outranks a price answer when both appear.
 */
export function detectTopics(reply: string, toolsUsed: string[] = []): DisclaimerTopic[] {
  const text = String(reply ?? '');
  const tools = new Set(toolsUsed);
  const topics: DisclaimerTopic[] = [];

  const has = (set: Set<string>) => [...tools].some(t => set.has(t));

  if (has(CLAIM_TOOLS) || CLAIM_WORDS.test(text)) topics.push('CLAIM');
  if (has(COVERAGE_TOOLS) || COVERAGE_WORDS.test(text)) topics.push('COVERAGE');
  if (MEDICAL_WORDS.test(text)) topics.push('MEDICAL');
  if (LEGAL_WORDS.test(text)) topics.push('LEGAL');
  if (has(PRICE_TOOLS) || PRICE_WORDS.test(text)) topics.push('PRICE');

  return topics.length > 0 ? topics : ['GENERAL'];
}

/**
 * The footnote the UI prints under this turn.
 *
 * At most two authority lines on top of the AI line — a wall of small print is
 * read by nobody, which defeats the point of having it.
 */
export function turnDisclaimer(reply: string, toolsUsed: string[] = []): string {
  const topics = detectTopics(reply, toolsUsed);
  const lines: string[] = [];

  const push = (line: string) => { if (!lines.includes(line) && lines.length < 2) lines.push(line); };

  for (const topic of topics) {
    if (topic === 'CLAIM' || topic === 'COVERAGE') push(INSURER_AUTHORITY);
    else if (topic === 'MEDICAL') push(MEDICAL_AUTHORITY);
    else if (topic === 'LEGAL') push(LEGAL_AUTHORITY);
    else if (topic === 'PRICE') push(PRICE_DISCLAIMER);
  }

  return [AI_DISCLAIMER, ...lines].join(' ');
}
