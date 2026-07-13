// Shared TypeScript types for the Supabase data layer.
//
// All interfaces that used to live in supabaseService.ts are gathered here so
// domain modules can import them via `import type { ... } from './dbTypes'`
// without pulling in the runtime Supabase client (which keeps the type-only
// imports cycle-free and tree-shakeable).

// ─── User & Agent ────────────────────────────────────────────────────────────

export interface SpUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  agent_code?: string;
  monthly_target?: number;
  trust_score?: number;
  created_at?: string;
  ktp?: string;
  address?: string;
  verified?: boolean;
  commission_rate?: number;
  upline_id?: string;
  referral_code?: string | null;
  tier?: 'STAR' | 'ELITE' | null;
  tier_assigned_by?: string | null;
  tier_assigned_at?: string | null;
  profile_photo_url?: string | null;
  ktp_document_url?: string | null;
  is_suspended?: boolean;
  // Multi-app access — NULL or single-element array = single-app routing
  // (uses role for legacy compat). Multi-element = AppSelector screen shown.
  // Values match UserRole enum: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN'.
  allowed_apps?: string[] | null;
  // B2B corporate fields
  company_name?: string | null;
  company_reg_no?: string | null;
  company_industry?: string | null;
}

export interface DownlineNode extends SpUser {
  l2: SpUser[];
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface SpClient {
  id: string;
  agent_id: string;
  name: string;
  phone: string;
  email?: string;
  ktp?: string;
  address?: string;
  occupation?: string;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Policies & Orders ───────────────────────────────────────────────────────

export interface SpPolicy {
  id: string;
  agent_id: string;
  client_id?: string;
  client_name: string;
  type: 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  premium: number;
  start_date: string;
  end_date: string;
  policy_number?: string;
  coverage_details?: any;
  created_at?: string;
}

export interface SpPolicyOrder {
  id: string;
  order_number?: string;
  agent_id: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  client_ktp?: string;
  product_code: string;
  product_name: string;
  vehicle_type?: 'CAR' | 'MOTORCYCLE';
  vehicle_details: any;
  vehicle_image_url?: string;
  ai_score?: number;
  ai_verdict?: string;
  ai_findings?: any[];
  coverage_type: 'COMPREHENSIVE' | 'TLO' | 'CUSTOM' | 'MPAR' | 'PA' | 'TRAVEL' | 'LIFE';
  sum_insured: number;
  zone: number;
  vehicle_category: number;
  addons: any;
  base_premium: number;
  addon_premium: number;
  admin_fee: number;
  stamp_duty: number;
  total_premium: number;
  ojk_rate?: number;
  discount_rate?: number;
  discount_amount?: number;
  promo_code?: string;
  net_premium?: number;
  commission_rate?: number;
  commission_amount?: number;
  coin_reward?: number;
  start_date?: string;
  end_date?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ISSUED' | 'REJECTED' | 'CANCELLED';
  reviewer_id?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  policy_number?: string;
  policy_document_url?: string;
  issued_at?: string;
  sp_policy_id?: string;
  insurer_id?: string;
  insurer_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpRenewal {
  id: string;
  original_order_id: string;
  agent_id: string;
  client_name: string;
  client_phone?: string;
  product_name: string;
  expiry_date: string;
  reminder_sent_at?: string;
  renewal_order_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpEndorsement {
  id: string;
  order_id: string;
  agent_id: string;
  type: 'ADDRESS' | 'PLATE' | 'SUM_INSURED' | 'ADDON' | 'DRIVER' | 'OTHER';
  description: string;
  old_value?: string;
  new_value?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_id?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  fee: number;
  created_at?: string;
}

export interface SpLifeApplication {
  id: string;
  order_number: string;
  agent_id: string;
  client_name: string;
  client_dob: string;
  client_gender: 'M' | 'F';
  client_phone: string;
  client_email: string;
  smoker: boolean;
  product_code: 'TERM_LIFE' | 'WHOLE_LIFE' | 'UNIT_LINK' | 'ENDOWMENT';
  sum_assured: number;
  payment_frequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  policy_term_years: number;
  riders: string[];
  health_declaration: Record<string, boolean>;
  beneficiary_name: string;
  beneficiary_relation: string;
  beneficiary_percentage: number;
  indicative_premium: number;
  status: string;
  policy_number?: string;
  insurer_notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Commissions, Quotes & Stats ─────────────────────────────────────────────

export interface SpCommission {
  id: string;
  agent_id: string;
  policy_id?: string;
  order_id?: string;
  order_number?: string;
  client_name: string;
  product_type: 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
  premium_amount: number;
  commission_amount: number;
  discount_rate?: number;
  coin_reward?: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  created_at?: string;
  paid_at?: string;
}

export interface SpQuote {
  id: string;
  agent_id: string;
  client_id?: string;
  client_name: string;
  product_type: 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
  status: 'DRAFT' | 'SENT' | 'CONVERTED' | 'EXPIRED';
  premium_estimate: number;
  details: any;
  created_at?: string;
  updated_at?: string;
}

export interface AgentStats {
  totalCommissionMonth: number;
  totalCommissionAllTime: number;
  clientsCount: number;
  policiesCount: number;
  pendingCommission: number;
}

export interface AdminStats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalPremiumIssued: number;
  totalPremiumPaid: number;
  activeAgents: number;
  pendingCommissions: number;
  topAgents: Array<{ agent_id: string; name: string; premium: number; orders: number }>;
}

// ─── Claims ──────────────────────────────────────────────────────────────────

export interface ClaimPhotoForensicReport {
  photoIndex: number;
  photoUrl: string;
  exif: { hasExif: boolean; captureTimestamp?: string; gpsLocation?: { lat: number; lng: number }; editingSoftware?: string; deviceModel?: string };
  duplicate: { isDuplicate: boolean; matchedSourceType?: 'CLAIM' | 'SURVEY'; matchedSourceId?: string; similarity?: number };
  ai: {
    authenticityScore: number;
    tamperIndicators: string[];
    damageAssessment: { part: string; condition: string; action: 'Perbaiki' | 'Ganti'; estimasiBiaya: number }[];
    isScreenPhoto: boolean;
    isStockOrDownloaded: boolean;
    plateVisible: boolean;
    confidence: number;
    severity: 'Ringan' | 'Sedang' | 'Berat' | 'Total Loss';
  };
  verdict: 'CLEAN' | 'FLAGGED' | 'HIGH_RISK';
  flagReasons: string[];
}

export interface SpClaim {
  id: string;
  policy_id?: string;
  user_id?: string;
  agent_id?: string;
  client_id?: string;
  claim_number?: string;
  claim_type?: string;
  description?: string;
  client_name?: string;
  policy_number?: string;
  product_type?: string;
  date?: string;
  incident_date?: string;
  location?: string;
  chronology?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  amount_estimated?: number;
  amount_approved?: number;
  photos?: string[];
  photo_urls?: string[];
  ai_fraud_score?: number;
  ai_fraud_verdict?: 'CLEAN' | 'REVIEW_REQUIRED' | 'REJECTED';
  ai_photo_reports?: ClaimPhotoForensicReport[];
  ai_analyzed_at?: string;
  admin_notes?: string;
  adjuster_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface SpNotification {
  id: string;
  agent_id: string;
  type: 'COMMISSION_EARNED' | 'CLAIM_UPDATE' | 'RENEWAL_ALERT' | 'QUOTE_ACCEPTED' | 'SYSTEM';
  title: string;
  body: string;
  read: boolean;
  metadata?: any;
  created_at?: string;
}

export interface SpAdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  order_id?: string;
  review_url?: string;
  metadata?: any;
  read: boolean;
  created_at: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface SpPayment {
  id: string;
  order_id: string;
  external_id: string;
  xendit_invoice_id?: string;
  invoice_url?: string;
  amount: number;
  currency: string;
  status: string; // PENDING | PAID | EXPIRED | FAILED
  payment_method?: string;
  payment_channel?: string;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Product Config & Coin Ledger ────────────────────────────────────────────

export interface SpProductConfig {
  id: string;
  product_code: string;
  product_name: string;
  vehicle_type: string;
  coverage_type: string;
  base_commission_rate: number; // 0.0 – 0.25
  max_discount_rate: number;    // 0.0 – base_commission_rate
  coin_rate: number;            // 0.05 – 0.25
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpCoinLedger {
  id: string;
  agent_id: string;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
  coins: number;
  rp_value: number;
  order_id?: string;
  description?: string;
  created_at?: string;
}

// ─── Insurers & Products ─────────────────────────────────────────────────────

export interface SpInsurer {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  admin_name?: string;
  admin_email?: string;
  pic_name?: string;
  pic_email?: string;
  pic_phone?: string;
  logo_url?: string;
  created_at?: string;
}

export interface SpInsurerAuthToken {
  id: string;
  insurer_id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at?: string;
  created_at?: string;
}

export interface SpInsurerProduct {
  id: string;
  insurer_id: string;
  product_type: string;
  vehicle_coverage: string;
  max_vehicle_age_years?: number | null;
  base_commission_rate: number;
  max_discount_rate: number;
  coin_rate: number;
  stamp_duty: number;
  policy_cost: number;
  authorized_garage_rate: number;
  authorized_garage_max_age_years: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  insurer_name?: string;
  insurer_code?: string;
  insurer_logo_url?: string;
}

export interface AvailableInsurerProductsResult {
  products: SpInsurerProduct[];
  excludedByAgeCount: number;
}

// ─── Vehicle Overrides ───────────────────────────────────────────────────────

export interface SpVehicleOverride {
  id: string;
  brand: string;
  model: string;
  ref_year: number;
  list_price_m: number;
  market_value_rp: number;
  discount_rate: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── OJK Rate Sets ───────────────────────────────────────────────────────────

export interface SpOjkRateSet {
  id: string;
  version: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  province_zones: Record<string, number>;
  category_bands: Record<string, number>;
  car_comp_min: Record<string, Record<string, number>>;
  car_comp_mid: Record<string, Record<string, number>>;
  car_comp_max: Record<string, Record<string, number>>;
  car_tlo_min: Record<string, Record<string, number>>;
  car_tlo_mid: Record<string, Record<string, number>>;
  car_tlo_max: Record<string, Record<string, number>>;
  moto_comp_min: number;
  moto_comp_mid: number;
  moto_comp_max: number;
  moto_tlo_min: Record<string, number>;
  moto_tlo_mid: Record<string, number>;
  moto_tlo_max: Record<string, number>;
  addon_rates: Record<string, number>;
  non_vehicle_rates: Record<string, any>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Review Tokens ───────────────────────────────────────────────────────────

export interface SpReviewToken {
  id: string;
  token: string;
  order_id: string;
  created_by?: string;
  expires_at: string;
  accessed_count: number;
  last_accessed_at?: string;
  insurer_action?: 'APPROVED' | 'REQUEST_INFO' | 'DECLINED';
  insurer_notes?: string;
  actioned_at?: string;
  created_at: string;
}

// ─── AI Reviews ──────────────────────────────────────────────────────────────

export interface AIPolicyReview {
  recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  flags: string[];
  suggested_notes: string;
  order_id?: string;
}

export interface AIFinanceReview {
  health_score: number;
  summary: {
    total_gwp: number;
    total_commissions: number;
    total_claims: number;
    commission_ratio: number;
    claim_ratio: number;
    net_revenue: number;
  };
  anomalies: Array<{ severity: string; description: string; amount: number | null }>;
  recommendations: Array<{ priority: string; action: string; impact: string }>;
  insights: string;
  alerts: string[];
  period_days?: number;
  generated_at?: string;
  raw_metrics?: any;
}

// ─── Wallet & Withdrawals ────────────────────────────────────────────────────

export interface AgentWallet {
  id: string;
  agent_id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  agent_id: string;
  type: 'COMMISSION_CREDIT' | 'COIN_CREDIT' | 'WITHDRAWAL_DEBIT' | 'WITHDRAWAL_REVERSAL';
  amount: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  agent_id: string;
  amount: number;
  xendit_fee: number;
  net_amount: number;
  bank_code: string;
  account_number: string;
  account_holder_name: string;
  status: 'PENDING_L1' | 'PENDING_L2' | 'PENDING_L3' | 'APPROVED' | 'PROCESSING' | 'DISBURSED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  xendit_disbursement_id: string | null;
  l1_approved_by: string | null;
  l1_approved_at: string | null;
  l2_approved_by: string | null;
  l2_approved_at: string | null;
  l3_approved_by: string | null;
  l3_approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  disbursed_at: string | null;
  scheduled_disburse_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Tier Config ─────────────────────────────────────────────────────────────

export interface SpTierConfig {
  tier: 'STANDARD' | 'STAR' | 'ELITE';
  coin_bonus_rate: number;
  l1_override_rate: number;
  l2_override_rate: number;
  updated_by?: string | null;
  updated_at?: string;
}

// ─── B2B ─────────────────────────────────────────────────────────────────────

export interface SpB2BSubmission {
  id: string;
  client_id: string;
  product_type: 'FLEET_MV' | 'BONDING' | 'GROUP_HEALTH';
  company_name: string;
  pic_name?: string;
  pic_phone?: string;
  pic_email?: string;
  submission_data: Record<string, any>;
  status: 'SUBMITTED' | 'REVIEWING' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
  admin_notes?: string;
  insurer_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface SpB2BQuote {
  id: string;
  submission_id: string;
  client_id: string;
  insurer_name?: string;
  premium_amount: number;
  coverage_details: Record<string, any>;
  valid_until?: string;
  terms?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

// ─── Promo Codes ─────────────────────────────────────────────────────────────

export interface SpPromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  applicable_products: string[];
  valid_from: string;
  valid_to: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Terms & Conditions ──────────────────────────────────────────────────────

export interface TncRecord {
  reference_number: string;
  tnc_version: string;
  accepted_at: string;
}

// ─── Online Users & Traffic ──────────────────────────────────────────────────

export interface OnlineUsersResult {
  total: number;
  byRole: Record<string, number>;
}

export interface TrafficStats {
  daily: Array<{ date: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
}

// ─── Security Stats ──────────────────────────────────────────────────────────

export interface SecurityStats {
  failedLogins24h: number;
  activeSessionsCount: number;
  lastLoginAt: string | null;
  blockedEntries: Array<{ email: string; attempts: number; until: number }>;
}

// ─── Website CMS Config ──────────────────────────────────────────────────────

export interface SpWebsiteConfig {
  id?: number;
  section_key: string;
  headline?: string | null;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_secondary_text?: string | null;
  bg_type: 'animated-mesh' | 'gradient' | 'solid' | 'image' | 'none';
  bg_value?: string | null;
  is_visible: boolean;
  extra_json?: Record<string, any>;
  updated_at?: string;
  created_at?: string;
}

// ─── Agent Legal Agreement ───────────────────────────────────────────────────
// SpAgentAgreement + AcceptAgreementResult are defined in services/agreements.ts
// to avoid duplicate export conflicts.

export interface AcceptAgreementResult {
  rec: import('./agreements').SpAgentAgreement | null;
  error: { code: string; message: string } | null;
}
