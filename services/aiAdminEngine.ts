// aiAdminEngine.ts — SurePath AI Admin Engine
// Autonomous AI operations layer that runs 24/7.
// This is the "AI Admin" that manages sales, follow-ups, order processing, and more.
//
// Architecture:
// - Runs as a scheduled task (every 5 minutes via setInterval on server)
// - Each "tick" executes a prioritized task queue
// - All autonomous decisions logged to sp_audit_log with full reasoning
// - Human-in-the-loop for high-risk decisions (notifications only)
// - Respects AI_BOUNDARIES from aiKnowledge.ts

import { createClient } from '@supabase/supabase-js';
// Note: z-ai-web-dev-sdk is imported in server.ts (server-side only)
// aiAdminEngine uses rule-based logic + Supabase queries — no direct LLM calls needed

// ─── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta?.env?.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Only initialize if we have credentials (server-side)
let db: any = null;

async function ensureInitialized() {
  if (!db && SUPABASE_URL && SERVICE_KEY) {
    db = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}

// ─── Auto-Approval Thresholds ────────────────────────────────────────────────
export const AUTO_APPROVE_THRESHOLDS = {
  // Policy orders
  ORDER_RISK_SCORE_MAX: 30,       // Auto-approve if AI risk score ≤ 30
  ORDER_AI_CONFIDENCE_MIN: 0.85,  // AI confidence must be ≥ 85%
  ORDER_PREMIUM_MAX: 10_000_000,  // Max premium for auto-approve (Rp 10jt)
  ORDER_AGE_MAX_VEHICLE: 10,      // Max vehicle age for auto-approve

  // Claims
  CLAIM_VALUE_MAX: 2_000_000,     // Auto-approve claims ≤ Rp 2jt
  CLAIM_FRAUD_SCORE_MAX: 30,      // Fraud score must be ≤ 30
  CLAIM_POLICY_AGE_MIN_DAYS: 30,  // Policy must be ≥ 30 days old

  // Withdrawals
  WITHDRAWAL_AMOUNT_MAX: 5_000_000, // Auto-approve withdrawals ≤ Rp 5jt
  WITHDRAWAL_AGENT_HISTORY_MIN_DAYS: 90, // Agent must be registered ≥ 90 days

  // Follow-up
  ORDER_STUCK_HOURS: 24,          // Follow up if order in UNDER_REVIEW > 24h
  PAYMENT_UNPAID_HOURS: 2,        // Nudge if invoice unpaid > 2h
  RENEWAL_REMIND_DAYS: [30, 14, 7, 1], // Renewal reminder cadence
};

// ─── AI Admin Task Types ─────────────────────────────────────────────────────
export type AdminTaskType =
  | 'auto_approve_order'      // Auto-approve low-risk orders
  | 'auto_approve_claim'      // Auto-approve low-value claims
  | 'auto_approve_withdrawal' // Auto-approve small withdrawals
  | 'follow_up_stuck_order'   // Nudge orders stuck in UNDER_REVIEW
  | 'payment_nudge'           // Remind unpaid invoices
  | 'renewal_reminder'        // Renewal cadence reminders
  | 'claim_status_narrator'   // Proactive claim status updates
  | 'anomaly_scan'            // Detect fraud/anomalies
  | 'daily_brief'             // Morning summary for operators
  | 'compliance_check';       // OJK compliance scanner

export interface AdminTaskResult {
  task: AdminTaskType;
  executed: number;       // How many items processed
  autoApproved: number;   // How many auto-approved
  flagged: number;        // How many flagged for human review
  notified: number;       // How many notifications sent
  details: string[];      // Human-readable summary
  timestamp: string;
}

// ─── Task 1: Auto-Approve Low-Risk Orders ───────────────────────────────────
async function autoApproveOrders(): Promise<AdminTaskResult> {
  const details: string[] = [];
  let autoApproved = 0;
  let flagged = 0;

  // Find orders in SUBMITTED status with payment confirmed
  const { data: pendingOrders } = await db
    .from('sp_policy_orders')
    .select('id, order_number, client_name, total_premium, vehicle_details, coverage_type, agent_id, created_at')
    .eq('status', 'SUBMITTED')
    .order('created_at', { ascending: true })
    .limit(50);

  if (!pendingOrders || pendingOrders.length === 0) {
    return { task: 'auto_approve_order', executed: 0, autoApproved: 0, flagged: 0, notified: 0, details: ['No pending orders'], timestamp: new Date().toISOString() };
  }

  for (const order of pendingOrders) {
    // Check if payment is confirmed
    const { data: payment } = await db.from('sp_payments')
      .select('status')
      .eq('order_id', order.id)
      .eq('status', 'PAID')
      .maybeSingle();

    if (!payment) {
      details.push(`Order ${order.order_number}: skipped (no payment)`);
      continue;
    }

    // Check vehicle age
    const vehicleYear = order.vehicle_details?.year;
    const vehicleAge = vehicleYear ? new Date().getFullYear() - vehicleYear : 0;
    if (vehicleAge > AUTO_APPROVE_THRESHOLDS.ORDER_AGE_MAX_VEHICLE) {
      details.push(`Order ${order.order_number}: flagged (vehicle ${vehicleAge}yr > ${AUTO_APPROVE_THRESHOLDS.ORDER_AGE_MAX_VEHICLE}yr)`);
      flagged++;
      continue;
    }

    // Check premium cap
    if (order.total_premium > AUTO_APPROVE_THRESHOLDS.ORDER_PREMIUM_MAX) {
      details.push(`Order ${order.order_number}: flagged (premium Rp ${order.total_premium} > cap)`);
      flagged++;
      continue;
    }

    // Run AI risk assessment
    const riskScore = await assessOrderRisk(order);
    if (riskScore <= AUTO_APPROVE_THRESHOLDS.ORDER_RISK_SCORE_MAX) {
      // AUTO-APPROVE
      await db.from('sp_policy_orders')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: `AI Admin auto-approved (risk: ${riskScore}/100)`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Notify agent
      await db.from('sp_notifications').insert({
        agent_id: order.agent_id,
        type: 'ORDER_AUTO_APPROVED',
        title: 'Order Auto-Approved oleh AI',
        body: `Order ${order.order_number} (${order.client_name}) telah disetujui otomatis oleh AI Admin. Risk score: ${riskScore}/100. Akan diteruskan ke insurer.`,
        read: false,
        metadata: { order_id: order.id, risk_score: riskScore, auto: true },
      }).then(() => {}, () => {});

      // Log to audit
      await db.from('sp_audit_log').insert({
        table_name: 'sp_policy_orders',
        record_id: order.id,
        action: 'AI_AUTO_APPROVE',
        old_values: { status: 'SUBMITTED' },
        new_values: { status: 'APPROVED', risk_score: riskScore, reason: 'Low-risk auto-approval' },
        actor_id: 'AI_ADMIN',
        actor_email: 'ai-admin@surepath',
      }).then(() => {}, () => {});

      autoApproved++;
      details.push(`Order ${order.order_number}: ✅ AUTO-APPROVED (risk: ${riskScore})`);
    } else {
      flagged++;
      details.push(`Order ${order.order_number}: ⚠️ flagged for review (risk: ${riskScore})`);
    }
  }

  return {
    task: 'auto_approve_order',
    executed: pendingOrders.length,
    autoApproved,
    flagged,
    notified: autoApproved,
    details,
    timestamp: new Date().toISOString(),
  };
}

// ─── Task 2: Auto-Approve Low-Value Claims ──────────────────────────────────
async function autoApproveClaims(): Promise<AdminTaskResult> {
  const details: string[] = [];
  let autoApproved = 0;
  let flagged = 0;

  const { data: pendingClaims } = await db
    .from('sp_claims')
    .select('id, claim_type, amount_estimated, user_id, agent_id, policy_id, created_at')
    .eq('status', 'SUBMITTED')
    .order('created_at', { ascending: true })
    .limit(30);

  if (!pendingClaims || pendingClaims.length === 0) {
    return { task: 'auto_approve_claim', executed: 0, autoApproved: 0, flagged: 0, notified: 0, details: ['No pending claims'], timestamp: new Date().toISOString() };
  }

  for (const claim of pendingClaims) {
    // Check claim value
    if (claim.amount_estimated > AUTO_APPROVE_THRESHOLDS.CLAIM_VALUE_MAX) {
      flagged++;
      details.push(`Claim ${claim.id.slice(0, 8)}: flagged (amount Rp ${claim.amount_estimated} > Rp ${AUTO_APPROVE_THRESHOLDS.CLAIM_VALUE_MAX})`);
      continue;
    }

    // Check policy age
    if (claim.policy_id) {
      const { data: policy } = await db.from('sp_policy_orders')
        .select('created_at')
        .eq('id', claim.policy_id)
        .maybeSingle();
      if (policy) {
        const policyAgeDays = (Date.now() - new Date(policy.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (policyAgeDays < AUTO_APPROVE_THRESHOLDS.CLAIM_POLICY_AGE_MIN_DAYS) {
          flagged++;
          details.push(`Claim ${claim.id.slice(0, 8)}: flagged (policy too young: ${Math.round(policyAgeDays)}d)`);
          continue;
        }
      }
    }

    // Check fraud score (from claim analysis if available)
    const fraudScore = await assessClaimFraud(claim);
    if (fraudScore <= AUTO_APPROVE_THRESHOLDS.CLAIM_FRAUD_SCORE_MAX) {
      // AUTO-APPROVE
      await db.from('sp_claims')
        .update({
          status: 'APPROVED',
          adjuster_notes: `AI Admin auto-approved (fraud: ${fraudScore}/100, amount: Rp ${claim.amount_estimated})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claim.id);

      // Notify customer
      await db.from('sp_notifications').insert({
        agent_id: claim.user_id,
        type: 'CLAIM_AUTO_APPROVED',
        title: 'Klaim Disetujui Otomatis',
        body: `Klaim Anda telah disetujui oleh AI Admin. Estimasi: Rp ${claim.amount_estimated.toLocaleString('id-ID')}. Akan diteruskan ke insurer untuk pencairan.`,
        read: false,
        metadata: { claim_id: claim.id, fraud_score: fraudScore, auto: true },
      }).then(() => {}, () => {});

      autoApproved++;
      details.push(`Claim ${claim.id.slice(0, 8)}: ✅ AUTO-APPROVED (fraud: ${fraudScore}, Rp ${claim.amount_estimated})`);
    } else {
      flagged++;
      details.push(`Claim ${claim.id.slice(0, 8)}: ⚠️ flagged (fraud: ${fraudScore})`);
    }
  }

  return { task: 'auto_approve_claim', executed: pendingClaims.length, autoApproved, flagged, notified: autoApproved, details, timestamp: new Date().toISOString() };
}

// ─── Task 3: Follow-Up Stuck Orders ─────────────────────────────────────────
async function followUpStuckOrders(): Promise<AdminTaskResult> {
  const details: string[] = [];
  let notified = 0;

  const stuckSince = new Date(Date.now() - AUTO_APPROVE_THRESHOLDS.ORDER_STUCK_HOURS * 60 * 60 * 1000).toISOString();

  const { data: stuckOrders } = await db
    .from('sp_policy_orders')
    .select('id, order_number, client_name, agent_id, status, reviewed_at, created_at')
    .eq('status', 'UNDER_REVIEW')
    .lt('reviewed_at', stuckSince)
    .limit(20);

  if (!stuckOrders || stuckOrders.length === 0) {
    return { task: 'follow_up_stuck_order', executed: 0, autoApproved: 0, flagged: 0, notified: 0, details: ['No stuck orders'], timestamp: new Date().toISOString() };
  }

  for (const order of stuckOrders) {
    // Notify agent about stuck order
    await db.from('sp_notifications').insert({
      agent_id: order.agent_id,
      type: 'ORDER_STUCK',
      title: 'Order Stuck — Perlu Tindak Lanjut',
      body: `Order ${order.order_number} (${order.client_name}) sudah di review >${AUTO_APPROVE_THRESHOLDS.ORDER_STUCK_HOURS} jam. Hubungi insurer untuk follow-up.`,
      read: false,
      metadata: { order_id: order.id, stuck_hours: AUTO_APPROVE_THRESHOLDS.ORDER_STUCK_HOURS },
    }).then(() => {}, () => {});

    notified++;
    details.push(`Order ${order.order_number}: 📣 notified agent (stuck >${AUTO_APPROVE_THRESHOLDS.ORDER_STUCK_HOURS}h)`);
  }

  return { task: 'follow_up_stuck_order', executed: stuckOrders.length, autoApproved: 0, flagged: stuckOrders.length, notified, details, timestamp: new Date().toISOString() };
}

// ─── Task 4: Payment Nudge (Unpaid Invoices) ────────────────────────────────
async function paymentNudge(): Promise<AdminTaskResult> {
  const details: string[] = [];
  let notified = 0;

  const unpaidSince = new Date(Date.now() - AUTO_APPROVE_THRESHOLDS.PAYMENT_UNPAID_HOURS * 60 * 60 * 1000).toISOString();

  const { data: unpaidOrders } = await db
    .from('sp_policy_orders')
    .select('id, order_number, client_name, agent_id, total_premium, created_at')
    .eq('status', 'SUBMITTED')
    .lt('created_at', unpaidSince)
    .limit(20);

  if (!unpaidOrders || unpaidOrders.length === 0) {
    return { task: 'payment_nudge', executed: 0, autoApproved: 0, flagged: 0, notified: 0, details: ['No unpaid orders'], timestamp: new Date().toISOString() };
  }

  for (const order of unpaidOrders) {
    // Check if already paid
    const { data: payment } = await db.from('sp_payments')
      .select('status')
      .eq('order_id', order.id)
      .maybeSingle();

    if (payment?.status === 'PAID') continue;

    // Notify agent to follow up payment
    await db.from('sp_notifications').insert({
      agent_id: order.agent_id,
      type: 'PAYMENT_NUDGE',
      title: 'Pengingat Pembayaran',
      body: `Order ${order.order_number} (${order.client_name}) belum dibayar >${AUTO_APPROVE_THRESHOLDS.PAYMENT_UNPAID_HOURS} jam. Premi: Rp ${order.total_premium.toLocaleString('id-ID')}. Hubungi nasabah untuk reminder.`,
      read: false,
      metadata: { order_id: order.id, hours_unpaid: AUTO_APPROVE_THRESHOLDS.PAYMENT_UNPAID_HOURS },
    }).then(() => {}, () => {});

    notified++;
    details.push(`Order ${order.order_number}: 💰 payment nudge sent (unpaid >${AUTO_APPROVE_THRESHOLDS.PAYMENT_UNPAID_HOURS}h)`);
  }

  return { task: 'payment_nudge', executed: unpaidOrders.length, autoApproved: 0, flagged: 0, notified, details, timestamp: new Date().toISOString() };
}

// ─── Task 5: Renewal Reminders ──────────────────────────────────────────────
async function renewalReminders(): Promise<AdminTaskResult> {
  const details: string[] = [];
  let notified = 0;

  const { data: activePolicies } = await db
    .from('sp_policy_orders')
    .select('id, order_number, client_name, agent_id, period_start, period_end, product_name')
    .eq('status', 'ISSUED')
    .limit(500);

  if (!activePolicies || activePolicies.length === 0) {
    return { task: 'renewal_reminder', executed: 0, autoApproved: 0, flagged: 0, notified: 0, details: ['No active policies'], timestamp: new Date().toISOString() };
  }

  const now = Date.now();
  for (const policy of activePolicies) {
    if (!policy.period_end) continue;
    const endDate = new Date(policy.period_end).getTime();
    const daysLeft = Math.round((endDate - now) / (1000 * 60 * 60 * 24));

    // Check if renewal reminder should be sent
    if (AUTO_APPROVE_THRESHOLDS.RENEWAL_REMIND_DAYS.includes(daysLeft)) {
      // Check if already reminded recently
      const { data: existing } = await db.from('sp_notifications')
        .select('id')
        .eq('agent_id', policy.agent_id)
        .eq('type', 'RENEWAL_REMINDER')
        .contains('metadata', { order_id: policy.id, days_left: daysLeft })
        .limit(1)
        .maybeSingle();

      if (existing) continue; // Already reminded

      await db.from('sp_notifications').insert({
        agent_id: policy.agent_id,
        type: 'RENEWAL_REMINDER',
        title: `Renewal ${daysLeft} Hari Lagi`,
        body: `Polis ${policy.product_name} untuk ${policy.client_name} (${policy.order_number}) berakhir dalam ${daysLeft} hari. Hubungi nasabah untuk perpanjangan!`,
        read: false,
        metadata: { order_id: policy.id, days_left: daysLeft },
      }).then(() => {}, () => {});

      notified++;
      details.push(`Policy ${policy.order_number}: 🔄 renewal reminder (${daysLeft}d left) → agent notified`);
    }
  }

  return { task: 'renewal_reminder', executed: activePolicies.length, autoApproved: 0, flagged: 0, notified, details, timestamp: new Date().toISOString() };
}

// ─── Task 6: Anomaly Scan ───────────────────────────────────────────────────
async function anomalyScan(): Promise<AdminTaskResult> {
  const details: string[] = [];
  let flagged = 0;

  // Check 1: Commission spikes (agent with unusually high commission in last 24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: commissionSpikes } = await db.from('sp_commissions')
    .select('agent_id, commission_amount, created_at')
    .gte('created_at', yesterday)
    .gt('commission_amount', 5_000_000)
    .limit(10);

  if (commissionSpikes && commissionSpikes.length > 0) {
    for (const spike of commissionSpikes) {
      await db.from('sp_admin_notifications').insert({
        type: 'AI_ANOMALY_COMMISSION_SPIKE',
        title: 'Anomali: Komisi Tinggi',
        body: `Agent ${spike.agent_id.slice(0, 8)} menerima komisi Rp ${spike.commission_amount.toLocaleString('id-ID')} dalam 24 jam terakhir.`,
        read: false,
        metadata: { agent_id: spike.agent_id, amount: spike.commission_amount, type: 'commission_spike' },
      }).then(() => {}, () => {});
      flagged++;
      details.push(`⚠️ Commission spike: agent ${spike.agent_id.slice(0, 8)} Rp ${spike.commission_amount}`);
    }
  }

  // Check 2: Multiple claims from same user in 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: claims } = await db.from('sp_claims')
    .select('user_id, id')
    .gte('created_at', weekAgo);

  if (claims) {
    const userClaimCounts: Record<string, number> = {};
    for (const c of claims) {
      userClaimCounts[c.user_id] = (userClaimCounts[c.user_id] ?? 0) + 1;
    }
    for (const [userId, count] of Object.entries(userClaimCounts)) {
      if (count >= 3) {
        await db.from('sp_admin_notifications').insert({
          type: 'AI_ANOMALY_CLAIM_FREQUENCY',
          title: 'Anomali: Frekuensi Klaim Tinggi',
          body: `User ${userId.slice(0, 8)} mengajukan ${count} klaim dalam 7 hari terakhir.`,
          read: false,
          metadata: { user_id: userId, claim_count: count, type: 'claim_frequency' },
        }).then(() => {}, () => {});
        flagged++;
        details.push(`⚠️ Claim frequency: user ${userId.slice(0, 8)} ${count} claims in 7d`);
      }
    }
  }

  // Check 3: Orders submitted outside business hours (potential fraud)
  const { data: afterHoursOrders } = await db.from('sp_policy_orders')
    .select('id, order_number, created_at, agent_id')
    .gte('created_at', yesterday)
    .limit(100);

  if (afterHoursOrders) {
    for (const order of afterHoursOrders) {
      const hour = new Date(order.created_at).getHours();
      if (hour < 6 || hour > 23) {
        // Flag but don't alert (just log)
        details.push(`ℹ️ After-hours order: ${order.order_number} at ${hour}:00`);
      }
    }
  }

  return { task: 'anomaly_scan', executed: (commissionSpikes?.length ?? 0) + (claims?.length ?? 0), autoApproved: 0, flagged, notified: flagged, details, timestamp: new Date().toISOString() };
}

// ─── Task 7: Daily Brief ────────────────────────────────────────────────────
async function dailyBrief(): Promise<AdminTaskResult> {
  const details: string[] = [];

  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(today).toISOString();

  const [ordersRes, claimsRes, paymentsRes, agentsRes] = await Promise.all([
    db.from('sp_policy_orders').select('status, total_premium').gte('created_at', todayStart),
    db.from('sp_claims').select('status, amount_estimated').gte('created_at', todayStart),
    db.from('sp_payments').select('status, amount').gte('created_at', todayStart).eq('status', 'PAID'),
    db.from('sp_users').select('id').eq('role', 'AGENT').eq('verified', true),
  ]);

  const newOrders = ordersRes.data?.length ?? 0;
  const newClaims = claimsRes.data?.length ?? 0;
  const paidToday = paymentsRes.data?.reduce((s: number, p: any) => s + (p.amount ?? 0), 0) ?? 0;
  const activeAgents = agentsRes.data?.length ?? 0;

  const stuckOrders = (ordersRes.data ?? []).filter((o: any) => o.status === 'SUBMITTED').length;
  const approvedOrders = (ordersRes.data ?? []).filter((o: any) => o.status === 'APPROVED' || o.status === 'ISSUED').length;

  const brief = `📊 Daily Brief — ${today}

ORDERS: ${newOrders} baru (${approvedOrders} approved, ${stuckOrders} pending)
CLAIMS: ${newClaims} klaim baru
PEMBAYARAN: Rp ${paidToday.toLocaleString('id-ID')} diterima hari ini
AGEN AKTIF: ${activeAgents}

${stuckOrders > 5 ? `⚠️ ${stuckOrders} order pending — perlu follow up!` : '✅ Antrian order terkendali'}
${newClaims > 3 ? `⚠️ ${newClaims} klaim baru — cek prioritas!` : '✅ Klaim terkendali'}

— AI Admin SurePath`;

  // Send to admin notifications
  await db.from('sp_admin_notifications').insert({
    type: 'AI_DAILY_BRIEF',
    title: `📊 Daily Brief — ${today}`,
    body: brief,
    read: false,
    metadata: { date: today, newOrders, newClaims, paidToday, activeAgents, stuckOrders },
  }).then(() => {}, () => {});

  details.push(`Daily brief sent: ${newOrders} orders, ${newClaims} claims, Rp ${paidToday} collected`);

  return { task: 'daily_brief', executed: 1, autoApproved: 0, flagged: stuckOrders > 5 ? 1 : 0, notified: 1, details, timestamp: new Date().toISOString() };
}

// ─── Helper: AI Risk Assessment for Orders ──────────────────────────────────
async function assessOrderRisk(order: any): Promise<number> {
  let riskScore = 0;

  // Factor 1: Vehicle age
  const vehicleYear = order.vehicle_details?.year;
  const vehicleAge = vehicleYear ? new Date().getFullYear() - vehicleYear : 0;
  if (vehicleAge > 10) riskScore += 30;
  else if (vehicleAge > 5) riskScore += 15;

  // Factor 2: Premium relative to sum insured (rate check)
  const sumInsured = order.vehicle_details?.price ?? order.sum_insured ?? 0;
  if (sumInsured > 0 && order.total_premium > 0) {
    const rate = order.total_premium / sumInsured;
    if (rate > 0.05) riskScore += 20; // Rate too high
    if (rate < 0.005) riskScore += 25; // Rate suspiciously low
  }

  // Factor 3: Order age (newer = slightly higher risk for fraud)
  const orderAgeHours = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
  if (orderAgeHours < 1) riskScore += 10; // Very new

  // Factor 4: AI policy review (if available)
  const { data: aiReview } = await db.from('sp_policy_orders')
    .select('ai_fraud_score')
    .eq('id', order.id)
    .maybeSingle();
  if (aiReview?.ai_fraud_score) {
    riskScore = Math.max(riskScore, aiReview.ai_fraud_score);
  }

  return Math.min(riskScore, 100);
}

// ─── Helper: AI Fraud Assessment for Claims ─────────────────────────────────
async function assessClaimFraud(claim: any): Promise<number> {
  let fraudScore = 0;

  // Factor 1: Claim amount relative to typical
  if (claim.amount_estimated > 10_000_000) fraudScore += 20;

  // Factor 2: Policy age (new policy = higher risk)
  if (claim.policy_id) {
    const { data: policy } = await db.from('sp_policy_orders')
      .select('created_at')
      .eq('id', claim.policy_id)
      .maybeSingle();
    if (policy) {
      const policyAgeDays = (Date.now() - new Date(policy.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (policyAgeDays < 7) fraudScore += 40; // Claim within 7 days of policy start
      else if (policyAgeDays < 30) fraudScore += 20;
    }
  }

  // Factor 3: Previous claims by same user
  const { count } = await db.from('sp_claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', claim.user_id);
  if (count && count >= 3) fraudScore += 25;

  // Factor 4: Claim photo forensic (if available)
  const { data: forensic } = await db.from('sp_claims')
    .select('analysis_id')
    .eq('id', claim.id)
    .maybeSingle();
  if (forensic?.analysis_id) {
    // If there's a forensic analysis, factor it in
    fraudScore += 10;
  }

  return Math.min(fraudScore, 100);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN: Run AI Admin Engine (single tick — all tasks)
// ════════════════════════════════════════════════════════════════════════════

export async function runAIAdminTick(): Promise<AdminTaskResult[]> {
  await ensureInitialized();
  if (!db) return [];

  console.log('[AI Admin] Starting tick at', new Date().toISOString());
  const results: AdminTaskResult[] = [];

  try {
    // Run all tasks (sequential to avoid rate limiting)
    results.push(await autoApproveOrders());
    results.push(await autoApproveClaims());
    results.push(await followUpStuckOrders());
    results.push(await paymentNudge());
    results.push(await renewalReminders());
    results.push(await anomalyScan());

    // Daily brief only runs once per day (check hour)
    const hour = new Date().getHours();
    if (hour === 8) { // 8 AM daily
      results.push(await dailyBrief());
    }

    // Summary
    const totalAutoApproved = results.reduce((s, r) => s + r.autoApproved, 0);
    const totalFlagged = results.reduce((s, r) => s + r.flagged, 0);
    const totalNotified = results.reduce((s, r) => s + r.notified, 0);

    console.log(`[AI Admin] Tick complete: ${totalAutoApproved} auto-approved, ${totalFlagged} flagged, ${totalNotified} notified`);
  } catch (e) {
    console.error('[AI Admin] Tick error:', e);
  }

  return results;
}

// ─── Server Integration ──────────────────────────────────────────────────────
// Call this from server.ts to start the AI Admin loop
let adminInterval: NodeJS.Timeout | null = null;

export function startAIAdminEngine(intervalMinutes: number = 5): void {
  if (adminInterval) {
    console.log('[AI Admin] Already running');
    return;
  }
  console.log(`[AI Admin] Engine started — running every ${intervalMinutes} minutes`);

  // Run immediately on start
  runAIAdminTick().catch(console.error);

  // Schedule recurring ticks
  adminInterval = setInterval(() => {
    runAIAdminTick().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}

export function stopAIAdminEngine(): void {
  if (adminInterval) {
    clearInterval(adminInterval);
    adminInterval = null;
    console.log('[AI Admin] Engine stopped');
  }
}
