// Unit tests untuk pipeline arsip dokumen pengajuan (audit 28 Okt 2026).
// Pure functions saja — tanpa Supabase/jaringan.
import { describe, expect, it } from 'vitest';
import {
  buildOrderDocPayload,
  dataUrlToBlob,
  SURVEY_SLOT_LABELS,
} from '../orderDocuments';

const orderNumber = 'ORD-20261028-0001';

const uploaded = (path: string, size = 1234, mime = 'image/jpeg') => ({
  path,
  size,
  mime,
});

describe('buildOrderDocPayload', () => {
  it('memetakan hasil unggahan menjadi payload gateway lengkap', () => {
    const payload = buildOrderDocPayload(
      [
        {
          docType: 'STNK',
          fileName: 'stnk.jpg',
          uploaded: uploaded(`${orderNumber}/stnk.jpg`, 200_000),
        },
        {
          docType: 'SURVEY_PHOTO',
          fileName: 'survey-front.jpg',
          uploaded: uploaded(`${orderNumber}/survey-front.jpg`),
          slot: 'front',
        },
        {
          docType: 'SURVEY_AUDIT_REPORT',
          fileName: 'survey-audit-report.pdf',
          uploaded: uploaded(`${orderNumber}/survey-audit-report.pdf`, 40_000, 'application/pdf'),
        },
      ],
      orderNumber,
    );

    expect(payload).toHaveLength(3);
    expect(payload[0]).toMatchObject({
      doc_type: 'STNK',
      bucket: 'order-documents',
      path: `${orderNumber}/stnk.jpg`,
      mime_type: 'image/jpeg',
      size_bytes: 200_000,
    });
    // url harus URL kanonik objek privat
    expect(payload[0].url).toContain(`/storage/v1/object/order-documents/${orderNumber}/stnk.jpg`);
    // slot tersimpan di meta untuk penelusuran
    expect(payload[1].meta).toMatchObject({ slot: 'front', order_number: orderNumber });
    expect(payload[2]).toMatchObject({
      doc_type: 'SURVEY_AUDIT_REPORT',
      mime_type: 'application/pdf',
    });
  });

  it('membuang item yang gagal diunggah (uploaded = null)', () => {
    const payload = buildOrderDocPayload(
      [
        { docType: 'STNK', fileName: 'stnk.jpg', uploaded: null },
        { docType: 'SURVEY_PHOTO', fileName: 'survey-back.jpg', uploaded: uploaded(`${orderNumber}/survey-back.jpg`), slot: 'back' },
      ],
      orderNumber,
    );
    expect(payload).toHaveLength(1);
    expect(payload[0].meta.slot).toBe('back');
  });

  it('mengembalikan array kosong ketika semua unggahan gagal', () => {
    const payload = buildOrderDocPayload(
      [{ docType: 'STNK', fileName: 'stnk.jpg', uploaded: null }],
      orderNumber,
    );
    expect(payload).toEqual([]);
  });

  it('path selalu berada di folder nomor order', () => {
    const payload = buildOrderDocPayload(
      [{ docType: 'VEHICLE_PHOTO', fileName: 'survey-front.jpg', uploaded: uploaded(`${orderNumber}/survey-front.jpg`), slot: 'front' }],
      orderNumber,
    );
    expect(payload[0].path.startsWith(`${orderNumber}/`)).toBe(true);
  });
});

describe('dataUrlToBlob', () => {
  it('mengubah dataURL JPEG menjadi Blob dengan mime yang benar', () => {
    // 1x1 px JPEG minimal (base64 statis)
    const jpegBase64 =
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';
    const blob = dataUrlToBlob(`data:image/jpeg;base64,${jpegBase64}`);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('mime default application/octet-stream bila header tidak dikenali', () => {
    const blob = dataUrlToBlob('data:;base64,QUJD');
    expect(blob.type).toBe('application/octet-stream');
    expect(blob.size).toBe(3);
  });
});

describe('SURVEY_SLOT_LABELS', () => {
  it('mencakup 5 slot survey standar', () => {
    expect(Object.keys(SURVEY_SLOT_LABELS).sort()).toEqual(
      ['back', 'front', 'interior', 'left', 'right'].sort(),
    );
  });
});
