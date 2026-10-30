// Storage uploads: vehicle images, policy documents, insurer logos, website
// assets, agent avatars/KTP, B2B documents, order submission documents
// (STNK / survey photos / audit reports), and signed-URL resolution for
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

export async function uploadClaimPhoto(file: File, userId: string, index: number): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'jpg');
  const path = `${userId}/${Date.now()}-${index}.${ext}`;
  const { error } = await supabase.storage
    .from('claim-photos')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadClaimPhoto:', error); return null; }
  const { data } = supabase.storage.from('claim-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPolicyDocument(file: File, orderNumber: string): Promise<string | null> {
  const ext = safeExt(file.name, ALLOWED_PDF_TYPES, 'pdf');
  const path = `${orderNumber}/policy.${ext}`;
  const { error } = await supabase.storage
    .from('policy-documents')
    .upload(path, file, { upsert: true, contentType: 'application/pdf' });
  if (error) { console.error('uploadPolicyDocument:', error); return null; }
  const { data } = await supabase.storage.from('policy-documents').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Order submission documents (private bucket `order-documents`) ──────────
// Audit 28 Okt 2026: STNK, foto survey, dan laporan audit foto kini diarsipkan
// per order. Bucket ini privat — unduhan memakai signed URL yang diterbitkan
// data-gateway setelah validasi kepemilikan (lihat resolveDocumentUrl).

export interface UploadedOrderDoc {
  path: string;
  size: number;
  mime: string;
}

/** URL kanonik objek privat (diselesaikan menjadi signed URL saat dilihat). */
export function orderDocCanonicalUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/order-documents/${path}`;
}

export async function uploadOrderDocumentObject(
  blob: Blob,
  orderNumber: string,
  fileName: string,
): Promise<UploadedOrderDoc | null> {
  const path = `${orderNumber}/${fileName}`;
  const { error } = await supabase.storage
    .from('order-documents')
    .upload(path, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
  if (error) { console.error('uploadOrderDocumentObject:', error); return null; }
  return { path, size: blob.size, mime: blob.type || 'application/octet-stream' };
}

/** Arsipkan PDF perjanjian mitra ke bucket privat agent-docs. */
export async function uploadAgentAgreementPdfBlob(
  blob: Blob,
  agentId: string,
  agreementNo: string,
): Promise<{ path: string; size: number } | null> {
  const safeNo = agreementNo.replace(/[^A-Za-z0-9_-]/g, '_');
  const path = `${agentId}/agreement-${safeNo}.pdf`;
  const { error } = await supabase.storage
    .from('agent-docs')
    .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
  if (error) { console.error('uploadAgentAgreementPdfBlob:', error); return null; }
  return { path, size: blob.size };
}

// policy-documents dan agent-docs privat dengan policy klien masing-masing
// (admin/owner boleh menandatangani dari browser). order-documents justru
// TANPA policy SELECT klien — signed URL-nya diterbitkan data-gateway
// (documents_signed_url) setelah pemeriksaan kepemilikan order server-side.
const SIGNED_URL_BUCKETS = new Set(['policy-documents', 'agent-docs']);
const GATEWAY_SIGNED_BUCKETS = new Set(['order-documents']);

export async function resolveDocumentUrl(rawUrl: string | null | undefined, expiresIn = 300): Promise<string | null> {
  if (!rawUrl) return null;
  // Cocokkan URL objek publik maupun privat: /object/{bucket}/... dan
  // /object/public/{bucket}/...
  const match = rawUrl.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
  if (!match) return rawUrl;
  const [, bucket, encodedPath] = match;
  const isPrivate = !rawUrl.includes('/storage/v1/object/public/');
  if (isPrivate && GATEWAY_SIGNED_BUCKETS.has(bucket)) {
    // Unduhan order-documents hanya lewat gateway (validasi kepemilikan).
    const path = decodeURIComponent(encodedPath).split('?')[0];
    const { data, error } = await callGateway('documents_signed_url', {
      bucket,
      path,
      expires_in: expiresIn,
    });
    const signedUrl = (data as any)?.signed_url as string | undefined;
    if (error || !signedUrl) {
      console.warn('resolveDocumentUrl(gateway):', error ?? 'no signed_url');
      return null;
    }
    return signedUrl;
  }
  if (!SIGNED_URL_BUCKETS.has(bucket)) return rawUrl;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(decodeURIComponent(encodedPath).split('?')[0], expiresIn);
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

const WEBSITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const WEBSITE_IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function uploadSectionImage(file: File, sectionKey: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const contentType = WEBSITE_IMAGE_TYPES[ext];
  if (
    !contentType ||
    file.size <= 0 ||
    file.size > WEBSITE_IMAGE_MAX_BYTES ||
    (file.type !== '' && file.type !== contentType)
  ) {
    console.warn('uploadSectionImage: unsupported image type or size');
    return null;
  }

  const safeSectionKey = sectionKey.replace(/[^a-z0-9_-]/gi, '_').slice(0, 64);
  const path = `sections/${safeSectionKey}.${ext}`;
  const { error } = await supabase.storage
    .from('website-assets')
    .upload(path, file, { upsert: true, contentType, cacheControl: '3600' });
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
  // Add cache-busting timestamp so the browser fetches the new image
  // instead of showing the old cached version
  const cacheBustUrl = `${data.publicUrl}?t=${Date.now()}`;
  await callGateway('update_my_profile', { profile_photo_url: cacheBustUrl }).then(() => {}, () => {});
  return cacheBustUrl;
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


/** Upload an app navigation icon managed from the admin dashboard. */
export async function uploadPortalIcon(file: File, iconKey: string): Promise<string | null> {
  const ext = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'png');
  const path = `app-icons/${iconKey}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('website-assets').upload(path, file, {
    upsert: false,
    contentType: file.type || 'image/png',
    cacheControl: '31536000',
  });
  if (error) { console.error('uploadPortalIcon:', error); return null; }
  const { data } = supabase.storage.from('website-assets').getPublicUrl(path);
  return data.publicUrl;
}
