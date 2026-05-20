const SUPABASE_URL = 'https://uyjgeteelnswphyzkjwi.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5amdldGVlbG5zd3BoeXprandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzEzNzUsImV4cCI6MjA5NDc0NzM3NX0.igFT0ExEh-RDn_eMvBi0HzAhCWD1G7jYVRFNOL4TFSU';

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
