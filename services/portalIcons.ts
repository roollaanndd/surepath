import { fetchWebsiteSection, upsertWebsiteSection, uploadPortalIcon } from './supabaseService';

export type PortalIconMap = Record<string, string>;
const SECTION_KEY = 'app_icons';
let cached: PortalIconMap = {};
let loaded = false;
let pending: Promise<PortalIconMap> | null = null;
const listeners = new Set<(icons: PortalIconMap) => void>();

function publish(next: PortalIconMap) {
  cached = next;
  loaded = true;
  listeners.forEach(listener => listener(cached));
}

export function subscribePortalIcons(listener: (icons: PortalIconMap) => void) {
  listeners.add(listener);
  listener(cached);
  return () => { listeners.delete(listener); };
}

export async function getPortalIconMap(force = false): Promise<PortalIconMap> {
  if (loaded && !force) return cached;
  if (pending && !force) return pending;
  pending = (async () => {
    const section = await fetchWebsiteSection(SECTION_KEY);
    const extra = section?.extra_json;
    const icons = extra && typeof extra === 'object' && extra.icons && typeof extra.icons === 'object'
      ? Object.fromEntries(Object.entries(extra.icons).filter(([key, value]) => /^[a-z0-9_-]{1,64}$/i.test(key) && typeof value === 'string'))
      : {};
    publish(icons as PortalIconMap);
    return cached;
  })();
  try { return await pending; } finally { pending = null; }
}

export async function savePortalIcon(iconKey: string, file: File): Promise<PortalIconMap | null> {
  if (!/^[a-z0-9_-]{1,64}$/i.test(iconKey)) return null;
  if (!file.type.startsWith('image/')) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.');
  const url = await uploadPortalIcon(file, iconKey);
  if (!url) throw new Error('Upload gambar gagal. Periksa koneksi dan izin storage.');
  const current = await getPortalIconMap();
  const next = { ...current, [iconKey]: url };
  const saved = await upsertWebsiteSection({
    section_key: SECTION_KEY,
    extra_json: { icons: next },
  });
  if (!saved) throw new Error('Gambar ter-upload tetapi konfigurasi belum tersimpan. Coba simpan ulang.');
  publish(next);
  return next;
}

export async function removePortalIcon(iconKey: string): Promise<PortalIconMap> {
  const current = await getPortalIconMap();
  const next = { ...current };
  delete next[iconKey];
  const saved = await upsertWebsiteSection({ section_key: SECTION_KEY, extra_json: { icons: next } });
  if (!saved) throw new Error('Perubahan belum tersimpan. Coba lagi.');
  publish(next);
  return next;
}
