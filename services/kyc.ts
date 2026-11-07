// KYC document upload helpers for the AddUserWizard.
//
// Client-side: file → base64 → gateway action admin_upload_kyc_file.
// Server writes the bytes to the kyc-documents bucket under
// {user_id}/{doc_type}/{uuid}.{ext} and merges the reference into
// sp_users.kyc_docs. Signed-URL uploads are a follow-up; base64-over-gateway
// is simpler for v1 and KYC documents are typically well under 2 MB.
//
// Keep per-file cap below the Edge Function payload ceiling (~6 MB raw ≈
// 4.4 MB base64), so we cap at 3 MB raw to leave headroom for other params.

import { callGateway } from './db';

/** Hard cap per file — bigger than this is rejected before base64 encode. */
export const KYC_FILE_MAX_BYTES = 3 * 1024 * 1024; // 3 MB

/** Accepted MIME types (mirror storage.buckets.allowed_mime_types). */
export const KYC_ACCEPTED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);

export interface UploadKycResult {
  path?: string;          // storage key once uploaded
  size_bytes?: number;
  mime?: string;
  error?: string;
}

/** Read a File into base64 (no data: prefix). */
export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunk to avoid stack overflow on large files.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadKycFile(input: {
  user_id: string;
  doc_type: string;
  file: File;
}): Promise<UploadKycResult> {
  const { user_id, doc_type, file } = input;
  if (file.size > KYC_FILE_MAX_BYTES) {
    return { error: `File ${file.name} terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimum 3 MB.` };
  }
  if (!KYC_ACCEPTED_MIME.has(file.type)) {
    return { error: `Tipe ${file.type || 'tidak dikenal'} tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.` };
  }
  const file_b64 = await fileToBase64(file);
  const res = await callGateway('admin_upload_kyc_file', {
    user_id,
    doc_type,
    file_b64,
    mime: file.type,
    size: file.size,
    original_name: file.name,
  });
  if (res.error) return { error: res.error };
  return {
    path: res.data?.path as string | undefined,
    size_bytes: res.data?.size_bytes as number | undefined,
    mime: res.data?.mime as string | undefined,
  };
}

/** Generate a short-lived signed URL to view a stored KYC document. */
export async function getKycDocSignedUrl(
  user_id: string,
  doc_type: string,
): Promise<string | null> {
  const res = await callGateway('admin_get_kyc_doc_url', { user_id, doc_type });
  if (res.error) return null;
  return (res.data?.signed_url as string | undefined) ?? null;
}
