// Storage uploads: vehicle images, policy documents, insurer logos, website
// assets, agent avatars/KTP, B2B documents, and signed-URL resolution for
// private buckets.

import { supabase, callGateway } from './db';

const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const ALLOWED_PDF_TYPES   = ['pdf'];

function safeExt(filename: string, allowed: string[], fallback: string): string {
  const raw = filename.split('.').pop()?.toLowerCase() ?? fallback;
  return allowed.includes(raw) ? raw : fallback;
}

// ─── Vehicle / policy uploads ─────────────────────────────────────────────────

export async function uploadVehicleImage(file: File, orderId: string): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'jpg');
  const path = `${orderId}/vehicle.${ext}`;
  const { error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadVehicleImage:', error); return null; }
  const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPolicyDocument(file: File, orderNumber: string): Promise<string | null> {
  const ext = safeExt(file.name, ALLOWED_PDF_TYPES, 'pdf');
  const path = `${orderNumber}/policy.${ext}`;
  const { error } = await supabase.storage
    .from('policy-documents')
    .upload(path, file, { upsert: true, contentType: 'application/pdf' });
  if (error) { console.error('uploadPolicyDocument:', error); return null; }
  const { data } = supabase.storage.from('policy-documents').getPublicUrl(path);
  return data.publicUrl;
}

// policy-documents and agent-docs are private buckets — the *_url fields
// still hold the old-style public URL string, so this swaps it for a
// short-lived signed URL at view time (RLS still scopes who may sign one).
const SIGNED_URL_BUCKETS = new Set(['policy-documents', 'agent-docs']);

export async function resolveDocumentUrl(rawUrl: string | null | undefined, expiresIn = 300): Promise<string | null> {
  if (!rawUrl) return null;
  const match = rawUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return rawUrl;
  const [, bucket, encodedPath] = match;
  if (!SIGNED_URL_BUCKETS.has(bucket)) return rawUrl;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(decodeURIComponent(encodedPath), expiresIn);
  if (error) { console.error('resolveDocumentUrl:', error); return null; }
  return data.signedUrl;
}

// ─── Insurer & website uploads ────────────────────────────────────────────────

export async function uploadInsurerLogo(insurerId: string, file: File): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'png');
  const path = `${insurerId}/logo.${ext}`;
  const { error } = await supabase.storage
    .from('insurer-logos')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadInsurerLogo:', error); return null; }
  const { data } = supabase.storage.from('insurer-logos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadLogoImage(file: File): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'png');
  const path = `logo/logo.${ext}`;
  const { error } = await supabase.storage
    .from('website-assets')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadLogoImage:', error); return null; }
  const { data } = supabase.storage.from('website-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSectionImage(file: File, sectionKey: string): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'jpg');
  const path = `sections/${sectionKey}.${ext}`;
  const { error } = await supabase.storage
    .from('website-assets')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadSectionImage:', error); return null; }
  const { data } = supabase.storage.from('website-assets').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Agent Avatar & KTP Upload ────────────────────────────────────────────────

export async function uploadAgentAvatar(agentId: string, base64: string): Promise<string | null> {
  const parts = base64.split(',');
  const byteStr = atob(parts[1] ?? parts[0]);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  const blob = new Blob([arr], { type: 'image/jpeg' });
  const path = `${agentId}/avatar.jpg`;
  const { error } = await supabase.storage.from('agent-profiles').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) { console.error('uploadAgentAvatar:', error); return null; }
  const { data } = supabase.storage.from('agent-profiles').getPublicUrl(path);
  await callGateway('update_my_profile', { profile_photo_url: data.publicUrl }).catch(() => {});
  return data.publicUrl;
}

export async function uploadAgentKtp(agentId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${agentId}/ktp.${ext}`;
  const { error } = await supabase.storage.from('agent-docs').upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadAgentKtp:', error); return null; }
  const { data } = supabase.storage.from('agent-docs').getPublicUrl(path);
  await callGateway('update_my_profile', { ktp_document_url: data.publicUrl }).catch(() => {});
  return data.publicUrl;
}

// ─── B2B Document Upload ──────────────────────────────────────────────────────

export async function uploadB2BDocument(
  submissionId: string,
  clientId: string,
  file: File,
  docType: string
): Promise<string | null> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${clientId}/${submissionId}/${docType}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('b2b-documents')
    .upload(path, file, { upsert: true });
  if (upErr) { console.error('uploadB2BDocument storage:', upErr); return null; }

  const { error: dbErr } = await supabase.from('sp_b2b_documents').insert({
    submission_id: submissionId,
    doc_type:      docType,
    file_name:     file.name,
    file_path:     path,
    file_size:     file.size,
    mime_type:     file.type,
  });
  if (dbErr) console.warn('sp_b2b_documents insert:', dbErr);

  return path;
}
