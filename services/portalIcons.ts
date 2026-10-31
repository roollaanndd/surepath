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
function validMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => /^[a-z0-9_-]{1,64}$/i.test(key) && typeof item === 'string'));
}
async function readConfig() {
  const section = await fetchWebsiteSection(SECTION_KEY);
  const extra = section?.extra_json;
  const record = extra && typeof extra === 'object' ? extra as Record<string, unknown> : {};
  return { icons: validMap(record.icons) };
}
async function persistConfig(nextIcons: PortalIconMap) {
  const saved = await upsertWebsiteSection({
    section_key: SECTION_KEY,
    extra_json: { icons: nextIcons },
  });
  if (!saved) throw new Error('Konfigurasi ikon belum tersimpan. Periksa izin CMS dan coba lagi.');
  publish(nextIcons);
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
    const config = await readConfig();
    publish(config.icons);
    return cached;
  })();
  try { return await pending; } finally { pending = null; }
}

export async function savePortalIcon(iconKey: string, file: File): Promise<PortalIconMap | null> {
  if (!/^[a-z0-9_-]{1,64}$/i.test(iconKey)) return null;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Gunakan gambar PNG, JPG, atau WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.');
  const url = await uploadPortalIcon(file, iconKey);
  if (!url) throw new Error('Upload gambar gagal. Periksa koneksi dan izin storage.');
  const config = await readConfig();
  const next = { ...config.icons, [iconKey]: url };
  await persistConfig(next);
  return next;
}

export async function removePortalIcon(iconKey: string): Promise<PortalIconMap> {
  const config = await readConfig();
  const next = { ...config.icons };
  delete next[iconKey];
  await persistConfig(next);
  return next;
}
