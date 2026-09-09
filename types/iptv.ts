export type DrmConfig = {
  manifestType: 'mpd' | 'm3u8';
  licenseType: string;
  licenseKey: string;
};

export type Channel = {
  id: string;
  name: string;
  group: string;
  logo: string | null;
  url: string;
  tvgId: string | null;
  userAgent: string | null;
  referer: string | null;
  drm: DrmConfig | null;
};

export type PlaylistSource = { id: string; name: string; url: string };
