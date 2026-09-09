import { Channel, DrmConfig } from '@/types/iptv';

function attribute(line: string, key: string): string | null {
  const match = line.match(new RegExp(`${key}=(?:"([^"]*)"|'([^']*)'|([^\s,]+))`, 'i'));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

export function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  let name = '', logo: string | null = null, tvgId: string | null = null;
  let group = 'Khác', userAgent: string | null = null, referer: string | null = null;
  let drm: DrmConfig | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const comma = line.lastIndexOf(',');
      name = comma >= 0 ? line.slice(comma + 1).trim() || 'Không tên' : 'Không tên';
      logo = attribute(line, 'tvg-logo'); tvgId = attribute(line, 'tvg-id');
      group = attribute(line, 'group-title') || 'Khác';
      userAgent = attribute(line, 'http-user-agent');
      referer = attribute(line, 'http-referrer') || attribute(line, 'referer');
      continue;
    }
    if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      userAgent = line.slice('#EXTVLCOPT:http-user-agent='.length).trim(); continue;
    }
    if (line.startsWith('#EXTVLCOPT:http-referrer=') || line.startsWith('#EXTHTTP:referrer=')) {
      const prefix = line.startsWith('#EXTVLCOPT:http-referrer=') ? '#EXTVLCOPT:http-referrer=' : '#EXTHTTP:referrer=';
      referer = line.slice(prefix.length).trim(); continue;
    }
    if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
      drm = { manifestType: drm ? drm.manifestType : 'mpd', licenseType: line.split('=').slice(1).join('=').trim(), licenseKey: drm ? drm.licenseKey : '' }; continue;
    }
    if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      drm = { manifestType: drm?.manifestType || 'mpd', licenseType: drm?.licenseType || 'clearkey', licenseKey: line.split('=').slice(1).join('=').trim() }; continue;
    }
    if (line.startsWith('#KODIPROP:inputstream.adaptive.manifest_type=')) {
      const manifestType = line.split('=').slice(1).join('=').trim();
      drm = { manifestType: manifestType === 'm3u8' ? 'm3u8' : 'mpd', licenseType: drm?.licenseType || 'clearkey', licenseKey: drm?.licenseKey || '' }; continue;
    }
    if (!line.startsWith('#')) {
      channels.push({ id: `ch-${channels.length}`, name: name || 'Không tên', group, logo, url: line, tvgId, userAgent, referer, drm });
      name = ''; logo = null; tvgId = null; group = 'Khác'; userAgent = null; referer = null; drm = null;
    }
  }
  return channels;
}
