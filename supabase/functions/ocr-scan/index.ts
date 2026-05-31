import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type DocType = 'KTP' | 'STNK';

interface OcrResult {
  status: 'OK' | 'MOCK' | 'ERROR';
  doc_type: DocType;
  fields: Record<string, string>;
}

// ── Text Parsers ──────────────────────────────────────────────────────────────

function parseKTP(text: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // NIK: 16 consecutive digits
  const nikMatch = text.match(/\b(\d{16})\b/);
  if (nikMatch) fields.nik = nikMatch[1];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^Nama\b/i.test(line)) {
      const val = line.replace(/^Nama\s*:?\s*/i, '').trim();
      fields.name = (val || lines[i + 1]) ?? '';
    }

    if (/^Tanggal\s*Lahir\b/i.test(line) || /^Tgl\.?\s*Lahir/i.test(line)) {
      const val = line.replace(/^Tanggal\s*Lahir\s*:?\s*/i, '')
                      .replace(/^Tgl\.?\s*Lahir\s*:?\s*/i, '').trim();
      fields.dob = (val || lines[i + 1]) ?? '';
    }

    if (/^Alamat\b/i.test(line)) {
      const val = line.replace(/^Alamat\s*:?\s*/i, '').trim();
      // Accumulate multi-line address until next keyword
      const parts = [val];
      let j = i + 1;
      while (j < lines.length && !/^(RT|RW|Kel|Kec|Kab|Kota|Agama|Nama|NIK|Pekerjaan)/i.test(lines[j])) {
        parts.push(lines[j]);
        j++;
      }
      fields.address = parts.filter(Boolean).join(', ');
    }
  }

  return fields;
}

function parseSTNK(text: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Plate number: e.g. B 1234 ABC or AB 123 CD
  const plateMatch = text.match(/\b([A-Z]{1,2})\s+(\d{1,4})\s+([A-Z]{1,3})\b/);
  if (plateMatch) fields.plate_number = `${plateMatch[1]} ${plateMatch[2]} ${plateMatch[3]}`;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(Merk|Merek|Make)\b/i.test(line)) {
      fields.make = (line.replace(/^(Merk|Merek|Make)\s*:?\s*/i, '').trim() || lines[i + 1]) ?? '';
    }
    if (/^(Model|Tipe|Type)\b/i.test(line)) {
      fields.model = (line.replace(/^(Model|Tipe|Type)\s*:?\s*/i, '').trim() || lines[i + 1]) ?? '';
    }
    if (/^No\.?\s*Rangka\b/i.test(line) || /^Nomor\s*Rangka/i.test(line)) {
      fields.chassis_no = (line.replace(/^(No\.?\s*Rangka|Nomor\s*Rangka)\s*:?\s*/i, '').trim() || lines[i + 1]) ?? '';
    }
    if (/^No\.?\s*Mesin\b/i.test(line) || /^Nomor\s*Mesin/i.test(line)) {
      fields.engine_no = (line.replace(/^(No\.?\s*Mesin|Nomor\s*Mesin)\s*:?\s*/i, '').trim() || lines[i + 1]) ?? '';
    }
  }

  return fields;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

function mockData(docType: DocType): Record<string, string> {
  if (docType === 'KTP') {
    return {
      nik: '3175012345678901',
      name: 'BUDI SANTOSO',
      dob: '01-01-1985',
      address: 'JL. SUDIRMAN NO. 10, JAKARTA SELATAN',
    };
  }
  return {
    plate_number: 'B 1234 ABC',
    make: 'TOYOTA',
    model: 'AVANZA',
    chassis_no: 'MHKM5EA3JFJ123456',
    engine_no: 'DR42J123456',
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    const { image_base64, doc_type } = await req.json() as { image_base64: string; doc_type: DocType };

    if (!image_base64 || !doc_type) {
      return json({ status: 'ERROR', doc_type: doc_type ?? 'KTP', fields: {}, message: 'image_base64 and doc_type required' }, 400);
    }
    if (doc_type !== 'KTP' && doc_type !== 'STNK') {
      return json({ status: 'ERROR', doc_type, fields: {}, message: 'doc_type must be KTP or STNK' }, 400);
    }

    // Attempt to read Google Vision API key from Vault
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    let apiKey: string | null = null;

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'GOOGLE_VISION_API_KEY' });
      apiKey = data ?? null;
    }

    // Fallback: check env directly (set in edge function secrets)
    if (!apiKey) {
      apiKey = Deno.env.get('GOOGLE_VISION_API_KEY') ?? null;
    }

    if (!apiKey) {
      // Return mock data when key unavailable
      const result: OcrResult = { status: 'MOCK', doc_type, fields: mockData(doc_type) };
      return json(result);
    }

    // Call Google Vision API
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image_base64 },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      console.error('Vision API error:', errText);
      return json({ status: 'ERROR', doc_type, fields: {}, message: 'Vision API error' }, 502);
    }

    const visionData = await visionRes.json();
    const fullText: string = visionData?.responses?.[0]?.fullTextAnnotation?.text ?? '';

    if (!fullText) {
      return json({ status: 'ERROR', doc_type, fields: {}, message: 'No text detected in image' }, 422);
    }

    const fields = doc_type === 'KTP' ? parseKTP(fullText) : parseSTNK(fullText);
    const result: OcrResult = { status: 'OK', doc_type, fields };
    return json(result);

  } catch (err) {
    console.error('ocr-scan error:', err);
    return json({ status: 'ERROR', doc_type: 'KTP', fields: {}, message: String(err) }, 500);
  }
});
