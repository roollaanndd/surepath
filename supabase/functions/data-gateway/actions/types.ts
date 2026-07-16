// Gateway domain modules — shared types and helpers.
// Each module receives GatewayContext and returns ActionResult | null.

export interface GatewayContext {
  db: any;
  params: Record<string, any>;
  caller: {
    authId: string;
    email: string;
    spUser: Record<string, any> | null;
    role: string | null;
    isAdmin: boolean;
    isFinanceAdmin: boolean;  // FIX v1.44.0: excludes OPERATOR — for commission/wallet actions
    userMetadata: Record<string, any> | null;
    // FIX v1.50.0: canonical owner id — sp_users.id when the profile exists,
    // else auth.users.id. Legacy accounts (pre-ensure_profile) have
    // sp_users.id ≠ auth.users.id; rows are written with sp_users.id, so all
    // "my data" reads must use this, never authId directly.
    ownerId: string;
    // Both ids, deduped — for reads that must also match legacy rows written
    // with authId (e.g. sp_claims.user_id, sp_notifications.agent_id).
    ownerIds: string[];
  };
  sendTelegram: (text: string) => void;
  logActivity: (insurerId: string | null, orderId: string | null, action: string, details?: Record<string, unknown>) => void;
  checkRateLimit: (identifier: string, limit: number) => Promise<boolean>;
  RESEND_KEY: string;
}

export interface ActionResult {
  status: number;
  body: unknown;
}

export const ok = (data: unknown): ActionResult => ({ status: 200, body: { data } });
export const err = (message: string, status = 400): ActionResult => ({ status, body: { error: message } });
