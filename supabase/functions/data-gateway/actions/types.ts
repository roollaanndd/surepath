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
    userMetadata: Record<string, any> | null;
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
