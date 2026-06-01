const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface XenditInvoiceResult {
  invoice_url: string;
  xendit_invoice_id: string;
  external_id: string;
  status: string;
}

export async function createXenditInvoice(params: {
  order_id: string;
  order_number: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  product_name: string;
  total_premium: number;
}): Promise<XenditInvoiceResult | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-xendit-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('createXenditInvoice error:', err);
      return null;
    }

    return (await res.json()) as XenditInvoiceResult;
  } catch (err) {
    console.error('createXenditInvoice error:', err);
    return null;
  }
}
