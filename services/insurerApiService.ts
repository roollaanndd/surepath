import { supabase } from './supabaseService';

export interface InsurerSubmissionResult {
  success: boolean;
  policy_number?: string;
  method: 'API' | 'MANUAL';
  message?: string;
  order_number?: string;
  insurer_name?: string;
}

/**
 * Submit a policy order to the appropriate insurer via the abstraction layer
 * edge function. Returns a structured result indicating whether the submission
 * went through the insurer's API or requires manual handling.
 */
export async function submitPolicyToInsurer(orderId: string): Promise<InsurerSubmissionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('submit-policy-insurer', {
      body: { order_id: orderId },
    });

    if (error) {
      console.error('submitPolicyToInsurer edge fn error:', error);
      return {
        success: false,
        method: 'MANUAL',
        message: error.message ?? 'Gagal menghubungi layanan pengajuan polis.',
      };
    }

    const result = data as {
      success: boolean;
      order_id?: string;
      order_number?: string;
      policy_number?: string;
      method?: 'API' | 'MANUAL';
      insurer_name?: string;
      error?: string;
    };

    if (!result.success) {
      return {
        success: false,
        method: 'MANUAL',
        message: result.error ?? 'Pengajuan polis gagal.',
      };
    }

    return {
      success: true,
      policy_number: result.policy_number ?? undefined,
      method: result.method ?? 'MANUAL',
      order_number: result.order_number,
      insurer_name: result.insurer_name,
    };
  } catch (err: any) {
    console.error('submitPolicyToInsurer unexpected error:', err);
    return {
      success: false,
      method: 'MANUAL',
      message: err?.message ?? 'Terjadi kesalahan tidak terduga.',
    };
  }
}
