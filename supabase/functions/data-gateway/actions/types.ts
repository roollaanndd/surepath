// Gateway domain modules — each handles a specific area of actions.
// The main index.ts imports these and dispatches to them.
// This keeps the main file thin while preserving the single Deno.serve entry point.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface GatewayContext {
  db: SupabaseClient;
  params: Record<string, any>;
  caller: {
    authId: string;
    email: string;
    spUser: Record<string, any> | null;
    role: string | null;
    isAdmin: boolean;
  };
  sendTelegram: (text: string) => void;
  sendInsurerEmail: (to: string, insurerName: string, orderNumber: string, clientName: string, productName: string, totalPremium: number, orderId: string) => void;
  logActivity: (insurerId: string | null, orderId: string | null, action: string, details?: Record<string, unknown>) => void;
  RESEND_KEY: string;
}

export interface ActionResult {
  status: number;
  body: unknown;
}

export const ok = (data: unknown): ActionResult => ({ status: 200, body: { data } });
export const err = (message: string, status = 400): ActionResult => ({ status, body: { error: message } });
