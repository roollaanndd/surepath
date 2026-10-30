// orderDocuments.ts — arsip dokumen pengajuan polis.
//
// Audit 28 Okt 2026: foto STNK + foto survey nasabah/agen sebelumnya hanya
// dipakai untuk analisa AI lalu dibuang — tidak ada bukti dokumenter yang
// bisa ditelusuri. Fungsi di sini mengarsipkan semuanya ke bucket privat
// `order-documents` ({orderNumber}/...), membuat Laporan Hasil Audit Foto
// Survey sebagai dokumen pelengkap, lalu mendaftarkannya lewat data-gateway
// (orders_attach_documents) sehingga admin & asuransi dapat melacak dan
// mengunduhnya. Kegagalan arsip TIDAK boleh menggagalkan order — hasil
// dilaporkan sebagai daftar item yang gagal.

import { callGateway } from './db';
import { compressImageBase64 } from './geminiService';
import {
  uploadOrderDocumentObject,
  orderDocCanonicalUrl,
  UploadedOrderDoc,
} from './storage';
import { buildSurveyAuditReportPdf, SurveyReportInput } from './surveyReportPdf';

// Label slot foto — konsisten dengan StepSurvey (car wizard) dan wizard agen.
export const SURVEY_SLOT_LABELS: Record<string, string> = {
  front:    'Depan Serong',
  back:     'Belakang Serong',
  right:    'Sisi Kanan',
  left:     'Sisi Kiri',
  interior: 'Dashboard',
};

export interface OrderDocGatewayPayload {
  doc_type: string;
  bucket: string;
  path: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  meta: Record<string, unknown>;
}

export interface AttachOrderResult {
  attached: number;
  failed: string[];        // label item yang gagal diarsipkan
  reportGenerated: boolean;
  skipped?: string;        // alasan arsip dilewati seluruhnya
}

// ─── Helper: dataURL → Blob ───────────────────────────────────────────────────
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  if (typeof atob !== 'function') throw new Error('atob unavailable');
  const byteStr = atob(body ?? '');
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

const fileToDataUrl = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Gagal membaca berkas'));
    r.readAsDataURL(file as Blob);
  });

const extOf = (dataUrl: string): string =>
  dataUrl.match(/data:image\/(jpe?g|png|webp)/i)?.[1]?.replace('jpeg', 'jpg') ?? 'jpg';

// ─── Pure: susun payload gateway dari hasil unggahan ────────────────────────
export function buildOrderDocPayload(
  uploads: Array<{ docType: string; fileName: string; uploaded: UploadedOrderDoc | null; slot?: string }>,
  orderNumber: string,
): OrderDocGatewayPayload[] {
  return uploads
    .filter((u) => u.uploaded != null)
    .map((u) => ({
      doc_type: u.docType,
      bucket: 'order-documents',
      path: u.uploaded!.path,
      url: orderDocCanonicalUrl(u.uploaded!.path),
      mime_type: u.uploaded!.mime,
      size_bytes: u.uploaded!.size,
      meta: { slot: u.slot ?? null, file: u.fileName, order_number: orderNumber },
    }));
}

// ─── Petakan hasil AI (survey car-wizard ATAU aiResult wizard agen) ─────────
function toReportAudit(survey: any, aiResult: any): SurveyReportInput['audit'] {
  const s = survey ?? {};
  const a = aiResult ?? {};
  const hasAgentAi = Object.keys(a).length > 0;
  const src = hasAgentAi ? a : s;
  return {
    score: src.score ?? undefined,
    verdict: (hasAgentAi ? src.auditVerdict : src.verdict) ?? undefined,
    summary: src.summary ?? undefined,
    underwritingReport: src.underwritingReport ?? undefined,
    detailedIssues: Array.isArray(src.detailedIssues) ? src.detailedIssues : [],
    photoFlags: Array.isArray(src.photoFlags) ? src.photoFlags : [],
    recommendations: Array.isArray(src.recommendations) ? src.recommendations : [],
    fraudAnalysis: src.fraudAnalysis ?? undefined,
    fraudRiskScore: src.fraudRiskScore ?? undefined,
    identityMatchScore: src.identityMatchScore ?? undefined,
    bodyConditionScore: src.bodyConditionScore ?? undefined,
    paintConditionScore: src.paintConditionScore ?? undefined,
    glassConditionScore: src.glassConditionScore ?? undefined,
    interiorConditionScore: src.interiorConditionScore ?? undefined,
    degraded: !hasAgentAi && !s.score && s.verdict === 'MANUAL_REQUIRED',
  };
}

// ─── Orkestrator utama ────────────────────────────────────────────────────────
export interface AttachOrderDocsInput {
  orderNumber: string;
  clientName: string;
  productName: string;
  vehicle: SurveyReportInput['vehicle'];
  /** Car wizard: hasil OCR STNK + state survey (foto base64). */
  stnkDataUrl?: string | null;
  stnkResult?: any;
  surveyPhotos?: Record<string, string> | null;
  survey?: any;
  /** Wizard agen: berkas foto asli + hasil AI. */
  photoFiles?: Record<string, File> | null;
  aiResult?: any;
}

/**
 * Arsipkan STNK, foto survey, dan laporan audit foto untuk sebuah order,
 * lalu daftarkan ke registry via gateway. Tidak pernah melempar — hasil
 * kegagalan dikembalikan sebagai daftar label.
 */
export async function attachOrderDocuments(
  input: AttachOrderDocsInput,
): Promise<AttachOrderResult> {
  const result: AttachOrderResult = { attached: 0, failed: [], reportGenerated: false };
  const { orderNumber } = input;
  if (!orderNumber) return { ...result, skipped: 'order_number kosong' };

  const uploads: Array<{ docType: string; fileName: string; uploaded: UploadedOrderDoc | null; slot?: string; label: string }> = [];

  // 1) STNK
  if (input.stnkDataUrl) {
    try {
      const compressed = await compressImageBase64(input.stnkDataUrl, 1600);
      const uploaded = await uploadOrderDocumentObject(
        dataUrlToBlob(compressed), orderNumber, `stnk.${extOf(compressed)}`);
      uploads.push({ docType: 'STNK', fileName: `stnk.${extOf(compressed)}`, uploaded, label: 'Foto STNK' });
      if (!uploaded) result.failed.push('Foto STNK');
    } catch (e) {
      console.warn('[orderDocuments] STNK:', e);
      uploads.push({ docType: 'STNK', fileName: 'stnk.jpg', uploaded: null, label: 'Foto STNK' });
      result.failed.push('Foto STNK');
    }
  }

  // 2) Foto survey — car wizard (dataURL per slot) atau wizard agen (File per slot)
  const photoEntries: Array<{ slot: string; label: string }> = [];
  const dataUrlPhotos = input.surveyPhotos ?? null;
  const filePhotos = input.photoFiles ?? null;
  const slots = new Set([...Object.keys(dataUrlPhotos ?? {}), ...Object.keys(filePhotos ?? {})]);
  for (const slot of slots) {
    const label = SURVEY_SLOT_LABELS[slot] ?? slot;
    photoEntries.push({ slot, label });
    const fileName = `survey-${slot}.jpg`;
    try {
      let uploaded: UploadedOrderDoc | null = null;
      if (dataUrlPhotos?.[slot]) {
        const compressed = await compressImageBase64(dataUrlPhotos[slot], 1600);
        uploaded = await uploadOrderDocumentObject(
          dataUrlToBlob(compressed), orderNumber, fileName);
      } else if (filePhotos?.[slot]) {
        const raw = await fileToDataUrl(filePhotos[slot]);
        const compressed = await compressImageBase64(raw, 1600);
        uploaded = await uploadOrderDocumentObject(
          dataUrlToBlob(compressed), orderNumber, fileName);
      }
      uploads.push({ docType: 'SURVEY_PHOTO', fileName, uploaded, slot, label });
      if (!uploaded) result.failed.push(`Foto ${label}`);
    } catch (e) {
      console.warn(`[orderDocuments] foto ${slot}:`, e);
      uploads.push({ docType: 'SURVEY_PHOTO', fileName, uploaded: null, slot, label });
      result.failed.push(`Foto ${label}`);
    }
  }

  // 3) Laporan hasil audit foto survey (dokumen pelengkap)
  try {
    const reportBlob = await buildSurveyAuditReportPdf({
      orderNumber,
      clientName: input.clientName,
      productName: input.productName,
      vehicle: input.vehicle,
      stnk: input.stnkResult ?? null,
      audit: toReportAudit(input.survey, input.aiResult),
      photos: photoEntries.map((p) => ({
        slot: p.slot,
        label: p.label,
        archived: uploads.some((u) => u.slot === p.slot && u.uploaded != null),
      })),
      stnkArchived: uploads.some((u) => u.docType === 'STNK' && u.uploaded != null),
    });
    const reportUploaded = await uploadOrderDocumentObject(
      reportBlob, orderNumber, 'survey-audit-report.pdf');
    uploads.push({ docType: 'SURVEY_AUDIT_REPORT', fileName: 'survey-audit-report.pdf', uploaded: reportUploaded, label: 'Laporan Audit Foto Survey' });
    if (reportUploaded) result.reportGenerated = true;
    else result.failed.push('Laporan Audit Foto Survey');
  } catch (e) {
    console.warn('[orderDocuments] laporan audit:', e);
    uploads.push({ docType: 'SURVEY_AUDIT_REPORT', fileName: 'survey-audit-report.pdf', uploaded: null, label: 'Laporan Audit Foto Survey' });
    result.failed.push('Laporan Audit Foto Survey');
  }

  // 4) Daftarkan yang berhasil ke registry lewat gateway
  const docs = buildOrderDocPayload(uploads, orderNumber);
  if (docs.length === 0) {
    result.skipped = 'Tidak ada dokumen yang berhasil diunggah';
    return result;
  }
  const { error } = await callGateway('orders_attach_documents', {
    order_number: orderNumber,
    docs,
  });
  if (error) {
    console.warn('[orderDocuments] attach:', error);
    result.skipped = String(error);
    return result;
  }
  result.attached = docs.length;
  return result;
}
