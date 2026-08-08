import { Movie } from '@/types/movie';

const OPHIM_BASE_URL = 'https://ophim1.com';
const KK_BASE_URL = 'https://phimapi.com';
const OPHIM_IMAGE_BASE_URL = 'https://img.ophim.live';
const NGUONC_BASE_URL = 'https://phim.nguonc.com/api';
const HOME_CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_SORT_FIELD = 'modified.time';
const DEFAULT_SORT_TYPE = 'desc';

let homeCache: { data: Movie[]; expiresAt: number } | null = null;
let homePendingPromise: Promise<Movie[]> | null = null;
const detailCache = new Map<string, Movie>();
const detailPendingCache = new Map<string, Promise<Movie | null>>();
const detailEnrichPendingCache = new Map<string, Promise<void>>();
const EXTERNAL_SOURCE_TIMEOUT_MS = 6000;

function normalizeDetailCacheKey(value: string): string {
  return value.trim();
}

function normalizeImageBaseUrl(value?: string): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function cacheDetailMovie(movie: Movie): void {
  const slugKey = normalizeDetailCacheKey(String(movie.slug || ''));
  const idKey = normalizeDetailCacheKey(String(movie.id || ''));

  if (slugKey) {
    detailCache.set(slugKey, movie);
  }

  if (idKey && idKey !== slugKey) {
    detailCache.set(idKey, movie);
  }
}

export function seedMovieDetailCache(movie: Movie): void {
  cacheDetailMovie(movie);
}

export function getCachedMovieBySlug(slug: string): Movie | null {
  const key = normalizeDetailCacheKey(String(slug || ''));
  if (!key) return null;
  return detailCache.get(key) ?? null;
}

function dedupeMovies(movies: Movie[]): Movie[] {
  const seen = new Set<string>();

  return movies.filter((movie) => {
    const key = normalizeDetailCacheKey(String(movie.slug || movie.id || ''));
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function hasPlayableData(movie: Movie | null | undefined): boolean {
  if (!movie) return false;

  return (
    (movie.servers?.length ?? 0) > 0 ||
    (movie.episodes_data?.length ?? 0) > 0 ||
    !!movie.stream_url
  );
}

function needsFreshDetail(movie: Movie | null | undefined): boolean {
  if (!movie) return false;

  const serverCount = movie.servers?.length ?? 0;
  const langText = normalizeCompareText(movie.lang || '');
  const hasLtHint = (movie.lang_key?.includes('lt') ?? false) || /longtieng|dubbed/.test(langText);
  const hasTmHint = (movie.lang_key?.includes('tm') ?? false) || /thuyetminh/.test(langText);
  const hasMultiAudioHint = hasLtHint || hasTmHint || (movie.lang_key?.length ?? 0) > 1 || /\+/.test(String(movie.lang || ''));

  if (!hasMultiAudioHint) {
    return false;
  }

  return serverCount < 2;
}

function mergeMovieDetails(primary: Movie, secondary: Movie): Movie {
  if (!hasPlayableData(secondary)) {
    return primary;
  }

  const mergedServers = [...(primary.servers || [])];
  const seenServers = new Set(
    mergedServers.map((server) => `${normalizeCompareText(server.name)}|${server.episodes?.[0]?.link_embed || ''}|${server.episodes?.[0]?.link_m3u8 || ''}`),
  );

  for (const server of secondary.servers || []) {
    const serverKey = `${normalizeCompareText(server.name)}|${server.episodes?.[0]?.link_embed || ''}|${server.episodes?.[0]?.link_m3u8 || ''}`;
    if (seenServers.has(serverKey)) {
      continue;
    }

    mergedServers.push(server);
    seenServers.add(serverKey);
  }

  const episodesData = mergedServers[0]?.episodes || primary.episodes_data || secondary.episodes_data || [];
  const streamUrl = primary.stream_url || secondary.stream_url || episodesData[0]?.link_m3u8 || episodesData[0]?.link_embed || '';

  return {
    ...primary,
    title: primary.title || secondary.title,
    title_en: primary.title_en || secondary.title_en,
    description: primary.description || secondary.description,
    thumb_url: primary.thumb_url || secondary.thumb_url,
    poster_url: primary.poster_url || secondary.poster_url,
    year: primary.year || secondary.year,
    duration: primary.duration || secondary.duration,
    duration_text: primary.duration_text || secondary.duration_text,
    quality: primary.quality || secondary.quality,
    lang: primary.lang || secondary.lang,
    servers: mergedServers,
    episodes_data: episodesData,
    stream_url: streamUrl,
    current_episode: Math.max(primary.current_episode || 0, secondary.current_episode || 0, 1),
    episodes: Math.max(primary.episodes || 0, secondary.episodes || 0, primary.current_episode || 0, secondary.current_episode || 0, 1),
  };
}

type OPhimResponse = {
  data?: {
    items?: unknown[];
    item?: Record<string, unknown>;
    APP_DOMAIN_CDN_IMAGE?: string;
  };
  items?: unknown[];
};

type NguoncEpisodeItem = {
  name?: string;
  slug?: string;
  embed?: string;
  m3u8?: string;
};

type NguoncEpisodeServer = {
  server_name?: string;
  items?: NguoncEpisodeItem[];
};

type NguoncCategoryBlock = {
  group?: {
    id?: string;
    name?: string;
  };
  list?: Array<{
    id?: string;
    name?: string;
  }>;
};

type NguoncMoviePayload = {
  id?: string;
  name?: string;
  slug?: string;
  original_name?: string;
  thumb_url?: string;
  poster_url?: string;
  description?: string;
  total_episodes?: number | string;
  current_episode?: number | string;
  time?: string;
  quality?: string;
  language?: string;
  director?: string | null;
  casts?: string;
  category?: Record<string, NguoncCategoryBlock>;
  episodes?: NguoncEpisodeServer[];
};

type NguoncDetailResponse = {
  status?: string;
  movie?: NguoncMoviePayload;
};

type NguoncSearchMovie = {
  slug?: string;
  original_name?: string;
  name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  current_episode?: number | string;
  total_episodes?: number | string;
  quality?: string;
  language?: string;
};

function normalizeImageUrl(url?: string, imageBaseUrl = OPHIM_IMAGE_BASE_URL): string {
  if (!url || url.trim() === '') {
    return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg';
  }

  // Xử lý protocol-relative URL: //example.com/...
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Path tuyệt đối: /uploads/movies/...
  if (url.startsWith('/')) {
    return `${imageBaseUrl}${url}`;
  }

  // Path đã có uploads/movies/ rồi → không ghép thêm
  if (url.startsWith('uploads/')) {
    return `${imageBaseUrl}/${url}`;
  }

  // Còn lại mới ghép đầy đủ
  return `${imageBaseUrl}/uploads/movies/${url}`;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const extracted = value.match(/\d+(\.\d+)?/);
    if (extracted) {
      return Number(extracted[0]);
    }
  }

  return fallback;
}

function stripHtml(content: string): string {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeCompareText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toIsoDateString(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const parsed = new Date(ms);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      const ms = asNumber > 1e12 ? asNumber : asNumber * 1000;
      const parsed = new Date(ms);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      return fallback;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return fallback;
}

function parseDateMs(value: string | undefined): number {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : 0;
}

function sortMoviesNewestDesc(movies: Movie[]): Movie[] {
  return [...movies].sort((a, b) => {
    const updatedDiff = parseDateMs(b.updated_at) - parseDateMs(a.updated_at);
    if (updatedDiff !== 0) return updatedDiff;

    const createdDiff = parseDateMs(b.created_at) - parseDateMs(a.created_at);
    if (createdDiff !== 0) return createdDiff;

    const yearDiff = toNumber(b.year, 0) - toNumber(a.year, 0);
    if (yearDiff !== 0) return yearDiff;

    const episodeDiff = toNumber(b.current_episode, 0) - toNumber(a.current_episode, 0);
    if (episodeDiff !== 0) return episodeDiff;

    return String(a.title || '').localeCompare(String(b.title || ''));
  });
}

function withDefaultNewestSort(path: string): string {
  const shouldForceSort =
    path.startsWith('/v1/api/tim-kiem') ||
    path.startsWith('/v1/api/danh-sach') ||
    path.startsWith('/v1/api/the-loai') ||
    path.startsWith('/v1/api/quoc-gia');

  if (!shouldForceSort) {
    return path;
  }

  const [basePath, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);

  if (!params.get('sort_field')) {
    params.set('sort_field', DEFAULT_SORT_FIELD);
  }
  if (!params.get('sort_type')) {
    params.set('sort_type', DEFAULT_SORT_TYPE);
  }

  return `${basePath}?${params.toString()}`;
}

function mapEpisodesList(rawEpisodes: unknown): Array<{ name: string; link_embed: string; link_m3u8: string }> {
  return Array.isArray(rawEpisodes)
    ? rawEpisodes.map((ep: any) => ({
        name: String(ep.name || ep.slug || 'Tập 1'),
        link_embed: String(ep.link_embed || ''),
        link_m3u8: String(ep.link_m3u8 || ''),
      }))
    : [];
}

function extractEpisodeNumber(value: string): number {
  const match = value.match(/\d+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCurrentEpisodeFromServers(servers: Array<{ name: string; episodes: Array<{ name: string; link_embed: string; link_m3u8: string }> }>): number {
  const maxFromServers = servers.reduce((max, server) => {
    const maxInServer = server.episodes.reduce((acc, ep) => Math.max(acc, extractEpisodeNumber(ep.name)), 0);
    return Math.max(max, maxInServer);
  }, 0);
  return Math.max(maxFromServers, 1);
}

function mapNguoncEpisodesList(rawEpisodes: unknown): Array<{ name: string; link_embed: string; link_m3u8: string }> {
  return Array.isArray(rawEpisodes)
    ? rawEpisodes.map((ep: NguoncEpisodeItem) => ({
        name: String(ep.name || ep.slug || 'Tập 1'),
        link_embed: String(ep.embed || ''),
        link_m3u8: String(ep.m3u8 || ''),
      }))
    : [];
}

function buildNguoncServers(rawServers: NguoncEpisodeServer[] | undefined): Array<{ name: string; episodes: Array<{ name: string; link_embed: string; link_m3u8: string }> }> {
  if (!Array.isArray(rawServers)) return [];
  return rawServers
    .map((srv, index) => ({
      name: `${String(srv.server_name || `Máy chủ ${index + 1}`)} [NC]`,
      episodes: mapNguoncEpisodesList(srv.items),
    }))
    .filter((srv) => srv.episodes.length > 0);
}

async function fetchNguoncMovieBySlug(slug: string): Promise<NguoncDetailResponse | null> {
  try {
    const response = await fetch(`${NGUONC_BASE_URL}/film/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as NguoncDetailResponse;
    if (json?.status !== 'success' || !json.movie) {
      return null;
    }

    return json;
  } catch {
    return null;
  }
}

function collectNguoncSearchMovies(payload: unknown): NguoncSearchMovie[] {
  const out: NguoncSearchMovie[] = [];
  const walk = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object') return;

    const rec = node as Record<string, unknown>;
    const slug = typeof rec.slug === 'string' ? rec.slug : '';
    const originalName = typeof rec.original_name === 'string' ? rec.original_name : '';
    const name = typeof rec.name === 'string' ? rec.name : '';
    const hasMovieSignals =
      !!originalName ||
      typeof rec.thumb_url === 'string' ||
      typeof rec.poster_url === 'string' ||
      typeof rec.current_episode === 'string' ||
      typeof rec.current_episode === 'number' ||
      typeof rec.total_episodes === 'string' ||
      typeof rec.total_episodes === 'number';

    if (slug && hasMovieSignals) {
      out.push({
        slug,
        original_name: originalName,
        name,
        thumb_url: typeof rec.thumb_url === 'string' ? rec.thumb_url : '',
        poster_url: typeof rec.poster_url === 'string' ? rec.poster_url : '',
        year: (typeof rec.year === 'string' || typeof rec.year === 'number') ? rec.year : undefined,
        current_episode: (typeof rec.current_episode === 'string' || typeof rec.current_episode === 'number') ? rec.current_episode : undefined,
        total_episodes: (typeof rec.total_episodes === 'string' || typeof rec.total_episodes === 'number') ? rec.total_episodes : undefined,
        quality: typeof rec.quality === 'string' ? rec.quality : '',
        language: typeof rec.language === 'string' ? rec.language : '',
      });
    }

    Object.values(rec).forEach((value) => {
      if (value && (Array.isArray(value) || typeof value === 'object')) {
        walk(value);
      }
    });
  };

  walk(payload);

  const seen = new Set<string>();
  return out.filter((item) => {
    const key = `${item.slug || ''}|${item.original_name || ''}|${item.name || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNguoncSearchCandidates(keyword: string): Promise<NguoncSearchMovie[]> {
  const q = keyword.trim();
  if (!q) return [];

  try {
    const response = await fetch(`${NGUONC_BASE_URL}/films/search?keyword=${encodeURIComponent(q)}`);
    if (!response.ok) return [];
    const json = (await response.json()) as unknown;
    return collectNguoncSearchMovies(json).filter((item) => !!item.slug);
  } catch {
    return [];
  }
}

async function resolveNguoncMovieForOphim(
  ophimSlug: string,
  ophimOriginName: string,
): Promise<NguoncDetailResponse | null> {
  const bySlug = await fetchNguoncMovieBySlug(ophimSlug);
  if (bySlug?.movie) {
    return bySlug;
  }

  const normalizedOrigin = normalizeCompareText(ophimOriginName);
  if (!normalizedOrigin) {
    return null;
  }

  const candidates = await fetchNguoncSearchCandidates(ophimOriginName);
  const exact = candidates.find((item) => {
    const cOrigin = normalizeCompareText(item.original_name || item.name || '');
    return !!cOrigin && cOrigin === normalizedOrigin;
  });

  if (!exact?.slug) {
    return null;
  }

  return fetchNguoncMovieBySlug(exact.slug);
}

async function loadMovieBySlugInternal(slug: string, bypassCache = false): Promise<Movie | null> {
    const normalizedSlug = normalizeDetailCacheKey(slug);
    if (!normalizedSlug) return null;

    if (!bypassCache) {
      const cached = getCachedMovieBySlug(normalizedSlug);
      if (cached) {
        return cached;
      }
    }

    const pending = detailPendingCache.get(normalizedSlug);
    if (pending) {
      return pending;
    }

    const loadingPromise = (async () => {
      const [item, kkItem] = await Promise.all([
        fetchOPhimItemBySlugSafe(normalizedSlug),
        fetchKKItemBySlugSafe(normalizedSlug),
      ]);

      if (item || kkItem) {
        const sourceItem = kkItem || item;
        const baseMovie = item && kkItem
          ? mergeMovieDetails(mapKKMovie(kkItem), mapOPhimMovie(item))
          : kkItem
            ? mapKKMovie(kkItem)
            : mapOPhimMovie(item!);
        cacheDetailMovie(baseMovie);

        if (!detailEnrichPendingCache.has(normalizedSlug)) {
          const enrichPromise = (async () => {
            const baseOrigin = String(sourceItem?.origin_name || sourceItem?.name || normalizedSlug);
            const nc = await withTimeout(
              resolveNguoncMovieForOphim(normalizedSlug, baseOrigin),
              EXTERNAL_SOURCE_TIMEOUT_MS,
              null as NguoncDetailResponse | null,
            );

            if (!nc?.movie) return;

            const latest = getCachedMovieBySlug(normalizedSlug) ?? baseMovie;
            let enriched = latest;

            if (nc?.movie && shouldMergeBySlugOrOrigin(sourceItem?.slug, sourceItem?.origin_name || sourceItem?.name, nc.movie.slug, nc.movie.original_name || nc.movie.name)) {
              const ncServers = buildNguoncServers(nc.movie.episodes);
              if (ncServers.length > 0) {
                const mergedServers = [...(enriched.servers || []), ...ncServers];
                const firstEpisodes = mergedServers[0]?.episodes || [];
                const ncTotal = toNumber(nc.movie.total_episodes, 0);
                const ncCurrent = toNumber(nc.movie.current_episode, 0);
                const mergedCurrent = Math.max(ncCurrent, getCurrentEpisodeFromServers(mergedServers));

                enriched = {
                  ...enriched,
                  servers: mergedServers,
                  episodes_data: firstEpisodes,
                  stream_url: firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || enriched.stream_url,
                  current_episode: Math.max(mergedCurrent, enriched.current_episode, 1),
                  episodes: Math.max(ncTotal, mergedCurrent, enriched.episodes, enriched.current_episode),
                };
              }
            }

            cacheDetailMovie(enriched);
          })().finally(() => {
            detailEnrichPendingCache.delete(normalizedSlug);
          });

          detailEnrichPendingCache.set(normalizedSlug, enrichPromise);
        }

        return getCachedMovieBySlug(normalizedSlug) ?? baseMovie;
      }

      let nc: NguoncDetailResponse | null = null;

      const initialOrigin = normalizedSlug;
      nc = await withTimeout(
        resolveNguoncMovieForOphim(normalizedSlug, initialOrigin),
        EXTERNAL_SOURCE_TIMEOUT_MS,
        null as NguoncDetailResponse | null,
      );

      let itemFromOrigin: Record<string, unknown> | null = null;
      let kkItemFromOrigin: Record<string, unknown> | null = null;
      const originCandidates = [
        String(nc?.movie?.original_name || nc?.movie?.name || ''),
      ].filter(Boolean);

      for (const candidate of originCandidates) {
        kkItemFromOrigin = await resolveKKMovieByOriginName(candidate);
        if (kkItemFromOrigin) break;

        itemFromOrigin = await resolveOPhimMovieByOriginName(candidate);
        if (itemFromOrigin) break;
      }

      if (itemFromOrigin) {
        const resolvedOrigin = String(itemFromOrigin.origin_name || itemFromOrigin.name || normalizedSlug);
        nc = await withTimeout(
          resolveNguoncMovieForOphim(normalizedSlug, resolvedOrigin),
          EXTERNAL_SOURCE_TIMEOUT_MS,
          nc as NguoncDetailResponse | null,
        );
      }

      if (!itemFromOrigin && !kkItemFromOrigin && !nc?.movie) {
        return null;
      }

      let movie: Movie;
      let baseSlug: unknown;
      let baseOrigin: unknown;

      if (kkItemFromOrigin) {
        movie = mapKKMovie(kkItemFromOrigin);
        baseSlug = kkItemFromOrigin.slug;
        baseOrigin = kkItemFromOrigin.origin_name || kkItemFromOrigin.name;
      } else if (itemFromOrigin) {
        movie = mapOPhimMovie(itemFromOrigin);
        baseSlug = itemFromOrigin.slug;
        baseOrigin = itemFromOrigin.origin_name || itemFromOrigin.name;
      } else {
        movie = mapNguoncMovie(nc!.movie!, normalizedSlug);
        baseSlug = nc!.movie!.slug || normalizedSlug;
        baseOrigin = nc!.movie!.original_name || nc!.movie!.name || '';
      }

      if (nc?.movie) {
        if (shouldMergeBySlugOrOrigin(baseSlug, baseOrigin, nc.movie.slug, nc.movie.original_name || nc.movie.name)) {
          const ncServers = buildNguoncServers(nc.movie.episodes);
          if (ncServers.length > 0) {
            const mergedServers = [...(movie.servers || []), ...ncServers];
            const firstEpisodes = mergedServers[0]?.episodes || [];
            const ncTotal = toNumber(nc.movie.total_episodes, 0);
            const ncCurrent = toNumber(nc.movie.current_episode, 0);
            const mergedCurrent = Math.max(ncCurrent, getCurrentEpisodeFromServers(mergedServers));

            movie.servers = mergedServers;
            movie.episodes_data = firstEpisodes;
            movie.stream_url = firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || movie.stream_url;
            movie.current_episode = Math.max(mergedCurrent, movie.current_episode, 1);
            movie.episodes = Math.max(ncTotal, mergedCurrent, movie.episodes, movie.current_episode);
          }
        }
      }

      cacheDetailMovie(movie);
      return movie;
    })();

    detailPendingCache.set(normalizedSlug, loadingPromise);
    try {
      return await loadingPromise;
    } finally {
      detailPendingCache.delete(normalizedSlug);
    }
  }

export async function getMovieBySlug(slug: string): Promise<Movie | null> {
  const normalizedSlug = normalizeDetailCacheKey(slug);
  if (!normalizedSlug) return null;

  const cached = getCachedMovieBySlug(normalizedSlug);
  if (cached) {
    const hasPlayableData =
      (cached.servers?.length ?? 0) > 0 ||
      (cached.episodes_data?.length ?? 0) > 0 ||
      !!cached.stream_url;

    if (!hasPlayableData || needsFreshDetail(cached)) {
      return loadMovieBySlugInternal(normalizedSlug, true);
    }

    // List payloads can be cached before full detail arrives.
    // If playback data is missing, await a fresh detail fetch instead of returning partial data.
    if (!detailPendingCache.has(normalizedSlug)) {
      void loadMovieBySlugInternal(normalizedSlug, true);
    }
    return cached;
  }

  return loadMovieBySlugInternal(normalizedSlug, false);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallbackValue);
      }
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallbackValue);
      });
  });
}

function shouldMergeNguoncMovie(ophimRaw: Record<string, unknown>, ncMovie: NguoncMoviePayload): boolean {
  const ophimSlug = normalizeCompareText(ophimRaw.slug);
  const ncSlug = normalizeCompareText(ncMovie.slug);
  const sameSlug = !!ophimSlug && !!ncSlug && ophimSlug === ncSlug;
  if (sameSlug) {
    return true;
  }

  const ophimOrigin = normalizeCompareText(ophimRaw.origin_name || ophimRaw.name);
  const ncOrigin = normalizeCompareText(ncMovie.original_name || ncMovie.name);
  return !!ophimOrigin && !!ncOrigin && ophimOrigin === ncOrigin;
}

function mapNguoncMovie(ncMovie: NguoncMoviePayload, requestedSlug: string): Movie {
  const servers = buildNguoncServers(ncMovie.episodes);
  const firstEpisodes = servers[0]?.episodes ?? [];
  const totalEpisodes = Math.max(toNumber(ncMovie.total_episodes, 1), 1);
  const currentEpisode = Math.max(toNumber(ncMovie.current_episode, 1), 1);

  const categoryBlocks = Object.values(ncMovie.category || {});
  const genreGroup = categoryBlocks.find((block) => normalizeCompareText(block.group?.name) === 'theloai');
  const countryGroup = categoryBlocks.find((block) => normalizeCompareText(block.group?.name) === 'quocgia');
  const yearGroup = categoryBlocks.find((block) => normalizeCompareText(block.group?.name) === 'nam');

  const genres = (genreGroup?.list || []).map((item) => String(item.name || '')).filter(Boolean);
  const country = (countryGroup?.list || []).map((item) => String(item.name || '')).find(Boolean) || '';
  const yearName = (yearGroup?.list || []).map((item) => String(item.name || '')).find(Boolean) || '';
  const year = Math.max(toNumber(yearName, new Date().getFullYear()), 1900);
  const actors = String(ncMovie.casts || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const nowIso = new Date().toISOString();

  return {
    id: String(ncMovie.slug || ncMovie.id || requestedSlug),
    slug: String(ncMovie.slug || requestedSlug),
    title: String(ncMovie.name || 'Đang cập nhật'),
    title_en: String(ncMovie.original_name || ncMovie.name || ''),
    description: String(ncMovie.description || 'Chưa có mô tả cho phim này.'),
    thumb_url: normalizeImageUrl(ncMovie.thumb_url || ncMovie.poster_url),
    poster_url: normalizeImageUrl(ncMovie.poster_url || ncMovie.thumb_url),
    imdb_rating: 0,
    year,
    episodes: Math.max(totalEpisodes, currentEpisode),
    current_episode: Math.min(Math.max(currentEpisode, 1), Math.max(totalEpisodes, 1)),
    duration: toNumber(ncMovie.time, 0),
    duration_text: String(ncMovie.time || ''),
    quality: String(ncMovie.quality || 'HD'),
    age_rating: 'T13',
    is_series: Math.max(totalEpisodes, currentEpisode) > 1,
    status: totalEpisodes > 0 && currentEpisode >= totalEpisodes ? 'completed' : 'ongoing',
    is_featured: false,
    created_at: nowIso,
    updated_at: nowIso,
    stream_url: firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || '',
    episodes_data: firstEpisodes,
    servers,
    genres,
    country,
    director: String(ncMovie.director || ''),
    actors,
    lang: String(ncMovie.language || ''),
    lang_key: [],
    last_episodes: [],
  };
}

function normalizeKKServerName(serverName: string, index: number): string {
  const base = String(serverName || `Server ${index + 1}`).trim();
  if (/\[KK\]/i.test(base)) {
    return base;
  }

  return `${base} [KK]`;
}

function mapOPhimMovie(raw: any, imageBaseUrl = OPHIM_IMAGE_BASE_URL): Movie {
  const episodeTotal = toNumber(raw.episode_total, 1);
  const rawEpisodeCurrent = String(raw.episode_current || '');
  const isTrailerStatus =
    String(raw.status || '').toLowerCase() === 'trailer' ||
    rawEpisodeCurrent.toLowerCase() === 'trailer';
  const currentEpisode = isTrailerStatus ? 0 : Math.max(toNumber(raw.episode_current, 1), 1);
  const rating = toNumber(raw.imdb?.vote_average ?? raw.tmdb?.vote_average ?? raw.imdb_rating, 0);

  const genres: string[] = Array.isArray(raw.category)
    ? raw.category.map((c: any) => String(c.name || '')).filter(Boolean)
    : [];

  const country: string = Array.isArray(raw.country)
    ? (raw.country[0]?.name || '')
    : String(raw.country?.name || raw.country || '');

  const director: string = Array.isArray(raw.director)
    ? raw.director.filter(Boolean).join(', ')
    : String(raw.director || '');

  const actors: string[] = Array.isArray(raw.actor)
    ? raw.actor.filter(Boolean)
    : typeof raw.actor === 'string' && raw.actor
    ? [raw.actor]
    : [];

  const fallbackNow = new Date().toISOString();
  const updatedAt = toIsoDateString(
    raw?.modified?.time ?? raw?.modified?.date ?? raw?.updated_at,
    fallbackNow,
  );
  const createdAt = toIsoDateString(
    raw?.created?.time ?? raw?.created?.date ?? raw?.created_at,
    updatedAt,
  );

  return {
    id: String(raw.slug || raw._id || raw.id || `${raw.name || 'movie'}-${raw.year || 'unknown'}`),
    slug: String(raw.slug || raw._id || raw.id || ''),
    title: String(raw.name || raw.title || 'Đang cập nhật'),
    title_en: String(raw.origin_name || raw.title_en || raw.name || ''),
    description: stripHtml(String(raw.content || raw.description || 'Chưa có mô tả cho phim này.')),
    poster_url : normalizeImageUrl(raw.thumb_url || raw.poster_url, imageBaseUrl),
    thumb_url: normalizeImageUrl(raw.poster_url || raw.thumb_url, imageBaseUrl),
    imdb_rating: Number(rating.toFixed(1)),
    year: toNumber(raw.year, new Date().getFullYear()),
    episodes: Math.max(episodeTotal, currentEpisode),
    current_episode: currentEpisode,
    duration: toNumber(raw.time, 0),
    duration_text: String(raw.time || ''),
    quality: String(raw.quality || 'HD'),
    age_rating: String(raw.age_rating || 'T13'),
    is_series: !isTrailerStatus && Math.max(episodeTotal, currentEpisode) > 1,
    status: isTrailerStatus ? 'trailer' : String(raw.status || ''),
    is_featured: false,
    created_at: createdAt,
    updated_at: updatedAt,
    stream_url: raw?.episodes?.[0]?.server_data?.[0]?.link_embed || raw?.episodes?.[0]?.server_data?.[0]?.link_m3u8,
    // trailer_url: String(raw.trailer_url || ''),
    episodes_data: Array.isArray(raw?.episodes?.[0]?.server_data)
      ? raw.episodes[0].server_data.map((ep: any) => ({
          name: String(ep.name || ep.slug || 'Tập 1'),
          link_embed: String(ep.link_embed || ''),
          link_m3u8: String(ep.link_m3u8 || ''),
        }))
      : [],
    servers: Array.isArray(raw?.episodes)
      ? raw.episodes.map((srv: any) => ({
          name: String(srv.server_name || 'Server 1'),
          episodes: Array.isArray(srv.server_data)
            ? srv.server_data.map((ep: any) => ({
                name: String(ep.name || ep.slug || 'Tập 1'),
                link_embed: String(ep.link_embed || ''),
                link_m3u8: String(ep.link_m3u8 || ''),
              }))
            : [],
        }))
      : [],
    genres,
    country,
    director,
    actors,
    tmdb_id: raw.tmdb?.id ? Number(raw.tmdb.id) : undefined,
    tmdb_type: raw.tmdb?.type === 'tv' ? 'tv' : 'movie',
    lang: String(raw.lang || ''),
    lang_key: Array.isArray(raw.lang_key) ? (raw.lang_key as string[]) : [],
    last_episodes: Array.isArray(raw.last_episodes)
      ? raw.last_episodes.map((ep: any) => ({
          server_name: String(ep.server_name || ''),
          name: String(ep.name || ''),
          is_ai: Boolean(ep.is_ai),
        }))
      : [],
  };
}

async function fetchSource(path: string, baseUrl: string): Promise<OPhimResponse> {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Source request failed: ${response.status}`);
  }

  return (await response.json()) as OPhimResponse;
}

async function fetchOPhim(path: string): Promise<OPhimResponse> {
  return fetchSource(path, OPHIM_BASE_URL);
}

async function fetchKK(path: string): Promise<OPhimResponse> {
  return fetchSource(path, KK_BASE_URL);
}

async function fetchMovieItemsFromSource(json: OPhimResponse): Promise<Array<Record<string, unknown>>> {
  const items = (json?.data?.items || json?.items || []) as Array<Record<string, unknown>>;
  return Array.isArray(items) ? items : [];
}

async function fetchMoviesBySource(baseUrl: string, path: string): Promise<Movie[]> {
  const json = await fetchSource(path, baseUrl);
  const imageBaseUrl = normalizeImageBaseUrl(json?.data?.APP_DOMAIN_CDN_IMAGE);
  const items = await fetchMovieItemsFromSource(json);

  return items
    .map((item) => (baseUrl === KK_BASE_URL ? mapKKMovie(item, imageBaseUrl || undefined) : mapOPhimMovie(item, imageBaseUrl || undefined)))
    .filter((movie) => !!movie.id && !!movie.slug && movie.status !== 'trailer');
}

async function fetchOPhimItemBySlugSafe(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const json = await fetchOPhim(`/v1/api/phim/${encodeURIComponent(slug)}`);
    return ((json?.data as any)?.item as Record<string, unknown> | undefined) || null;
  } catch {
    return null;
  }
}

async function fetchKKItemBySlugSafe(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const json = await fetchKK(`/v1/api/phim/${encodeURIComponent(slug)}`);
    return ((json?.data as any)?.item as Record<string, unknown> | undefined) || null;
  } catch {
    return null;
  }
}

async function resolveOPhimMovieByOriginName(originName: string): Promise<Record<string, unknown> | null> {
  const q = originName.trim();
  if (!q) return null;

  try {
    const search = await fetchOPhim(`/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&limit=24`);
    const items = ((search?.data as any)?.items || []) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    const target = normalizeCompareText(originName);
    const exact = items.find((it) => {
      const n = normalizeCompareText(it.origin_name || it.name || '');
      return !!n && n === target;
    }) || items.find((it) => !!it.slug);

    const foundSlug = String(exact?.slug || '').trim();
    if (!foundSlug) {
      return null;
    }

    return fetchOPhimItemBySlugSafe(foundSlug);
  } catch {
    return null;
  }
}

async function resolveKKMovieByOriginName(originName: string): Promise<Record<string, unknown> | null> {
  const q = originName.trim();
  if (!q) return null;

  try {
    const search = await fetchKK(`/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&limit=24`);
    const items = ((search?.data as any)?.items || []) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    const target = normalizeCompareText(originName);
    const exact = items.find((it) => {
      const n = normalizeCompareText(it.origin_name || it.name || '');
      return !!n && n === target;
    }) || items.find((it) => !!it.slug);

    const foundSlug = String(exact?.slug || '').trim();
    if (!foundSlug) {
      return null;
    }

    return fetchKKItemBySlugSafe(foundSlug);
  } catch {
    return null;
  }
}

function shouldMergeBySlugOrOrigin(
  baseSlug: unknown,
  baseOrigin: unknown,
  candidateSlug: unknown,
  candidateOrigin: unknown,
): boolean {
  const aSlug = normalizeCompareText(baseSlug);
  const bSlug = normalizeCompareText(candidateSlug);
  if (aSlug && bSlug && aSlug === bSlug) {
    return true;
  }

  const aOrigin = normalizeCompareText(baseOrigin);
  const bOrigin = normalizeCompareText(candidateOrigin);
  return !!aOrigin && !!bOrigin && aOrigin === bOrigin;
}

async function fetchMergedMoviesByPath(path: string): Promise<Movie[]> {
  const sortedPath = withDefaultNewestSort(path);
  const [ophimResult, kkResult] = await Promise.allSettled([
    fetchMoviesBySource(OPHIM_BASE_URL, sortedPath),
    fetchMoviesBySource(KK_BASE_URL, sortedPath),
  ]);

  const movies = [
    ...(kkResult.status === 'fulfilled' ? kkResult.value : []),
    ...(ophimResult.status === 'fulfilled' ? ophimResult.value : []),
  ];

  return sortMoviesNewestDesc(dedupeMovies(movies));
}

export async function getHomeMovies(): Promise<Movie[]> {
  if (homeCache && Date.now() < homeCache.expiresAt) {
    return homeCache.data;
  }

  if (homePendingPromise) {
    return homePendingPromise;
  }

  homePendingPromise = (async () => {
    const data = await fetchMergedMoviesByPath('/v1/api/home');
    homeCache = {
      data,
      expiresAt: Date.now() + HOME_CACHE_TTL,
    };
    return data;
  })();

  try {
    return await homePendingPromise;
  } finally {
    homePendingPromise = null;
  }
}

export async function getMoviesByCountry(country: string, page: number = 1): Promise<Movie[]> {
  try {
    return await fetchMergedMoviesByPath(`/v1/api/quoc-gia/${country}?page=${page}`);
  } catch {
    return [];
  }
}

function parseTotalPages(data: any): number {
  const p = data?.params?.pagination ?? data?.pagination ?? {};
  if (p.totalPages) return Number(p.totalPages);
  if (p.total_pages) return Number(p.total_pages);
  if (p.totalItems && p.totalItemsPerPage)
    return Math.ceil(Number(p.totalItems) / Number(p.totalItemsPerPage));
  if (p.total && p.limit) return Math.ceil(Number(p.total) / Number(p.limit));
  return 1;
}

export async function getMoviesByCountryPaged(
  country: string,
  page: number = 1,
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const json = await fetchOPhim(`/v1/api/quoc-gia/${country}?page=${page}`);
    const totalPages = parseTotalPages(json?.data as any);
    const movies = await fetchMergedMoviesByPath(`/v1/api/quoc-gia/${country}?page=${page}`);
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export async function getMoviesByType(type: string, page: number = 1): Promise<Movie[]> {
  try {
    return await fetchMergedMoviesByPath(`/v1/api/danh-sach/${type}?page=${page}`);
  } catch {
    return [];
  }
}

export async function getMoviesByTypePaged(
  type: string,
  page: number = 1,
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const json = await fetchOPhim(`/v1/api/danh-sach/${type}?page=${page}`);
    const totalPages = parseTotalPages(json?.data as any);
    const movies = await fetchMergedMoviesByPath(`/v1/api/danh-sach/${type}?page=${page}`);
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export async function getMoviesByGenrePaged(
  genre: string,
  page: number = 1,
  sort: 'moi-nhat' | 'xem-nhieu' = 'moi-nhat',
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const sortParam =
      sort === 'xem-nhieu' ? '&sort_field=view&sort_type=desc' : '';
    const json = await fetchOPhim(`/v1/api/the-loai/${genre}?page=${page}${sortParam}`);
    const totalPages = parseTotalPages(json?.data as any);
    const movies = await fetchMergedMoviesByPath(`/v1/api/the-loai/${genre}?page=${page}${sortParam}`);
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export function prefetchMovieBySlug(slug: string): void {
  const normalized = slug?.trim();
  if (!normalized) return;
  void getMovieBySlug(normalized);
}

export async function getMoviesFilteredPaged(
  params: {
    movieType?: string;
    country?: string;
    genre?: string;
    year?: number | null;
    sort?: string;
  },
  page = 1,
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const { movieType, country, genre, year, sort } = params;
    const extra: string[] = [`page=${page}`];
    if (year) extra.push(`year=${year}`);
    if (sort) extra.push(`sort_field=${encodeURIComponent(sort)}`, `sort_type=desc`);

    let path: string;
    if (movieType) {
      path = `/v1/api/danh-sach/${encodeURIComponent(movieType)}?${extra.join('&')}`;
    } else if (genre) {
      path = `/v1/api/the-loai/${encodeURIComponent(genre)}?${extra.join('&')}`;
    } else if (country) {
      path = `/v1/api/quoc-gia/${encodeURIComponent(country)}?${extra.join('&')}`;
    } else {
      path = `/v1/api/danh-sach/phim-moi?${extra.join('&')}`;
    }

    const json = await fetchOPhim(path);
    const totalPages = parseTotalPages(json?.data as any);
    const movies = await fetchMergedMoviesByPath(path);
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export async function searchMovies(keyword: string): Promise<Movie[]> {
  try {
    return await fetchMergedMoviesByPath(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=24`);
  } catch {
    return [];
  }
}

export async function searchMoviesWithFilters(params: {
  keyword?: string;
  genre?: string;
  country?: string;
  type?: string;
  year?: number | null;
  sort?: string;
}): Promise<Movie[]> {
  try {
    const { keyword, genre, country, type, year, sort } = params;
    const kw = keyword?.trim() ?? '';

    const extra: string[] = [];
    if (year) extra.push(`year=${year}`);
    if (sort) extra.push(`sort_field=${encodeURIComponent(sort)}`, `sort_type=desc`);

    let path: string;

    if (kw) {
      const q: string[] = [`keyword=${encodeURIComponent(kw)}`, 'limit=24'];
      if (genre) q.push(`the_loai=${genre}`);
      if (country) q.push(`quoc_gia=${country}`);
      if (type) q.push(`loai=${type}`);
      q.push(...extra);
      path = `/v1/api/tim-kiem?${q.join('&')}`;
    } else if (type) {
      const q: string[] = ['page=1'];
      if (genre) q.push(`the_loai=${genre}`);
      if (country) q.push(`quoc_gia=${country}`);
      q.push(...extra);
      path = `/v1/api/danh-sach/${encodeURIComponent(type)}?${q.join('&')}`;
    } else if (genre) {
      const q: string[] = ['page=1'];
      if (country) q.push(`quoc_gia=${country}`);
      q.push(...extra);
      path = `/v1/api/the-loai/${encodeURIComponent(genre)}?${q.join('&')}`;
    } else if (country) {
      const q: string[] = ['page=1'];
      q.push(...extra);
      path = `/v1/api/quoc-gia/${encodeURIComponent(country)}?${q.join('&')}`;
    } else {
      const q: string[] = ['page=1'];
      q.push(...extra);
      path = `/v1/api/danh-sach/phim-bo?${q.join('&')}`;
    }

    const [movies, ncCandidates] = await Promise.all([
      fetchMergedMoviesByPath(path),
      kw ? fetchNguoncSearchCandidates(kw) : Promise.resolve([]),
    ]);

    if (!kw) {
      return movies;
    }

    const slugSeen = new Set(movies.map((movie) => normalizeCompareText(movie.slug || movie.id)));

    const ncMovies = ncCandidates
      .filter((item) => {
        const slugKey = normalizeCompareText(item.slug);
        return !!slugKey && !slugSeen.has(slugKey);
      })
      .map((item) => {
        const mapped = mapNguoncSearchMovie(item);
        slugSeen.add(normalizeCompareText(mapped.slug || mapped.id));
        return mapped;
      });

    return dedupeMovies([...movies, ...ncMovies]);
  } catch {
    return [];
  }
}

function mapNguoncSearchMovie(item: NguoncSearchMovie): Movie {
  const total = Math.max(toNumber(item.total_episodes, 1), 1);
  const current = Math.max(toNumber(item.current_episode, 1), 1);
  return {
    id: String(item.slug || item.name || item.original_name || 'nc-movie'),
    slug: String(item.slug || ''),
    title: String(item.name || item.original_name || 'Đang cập nhật'),
    title_en: String(item.original_name || item.name || ''),
    description: 'Nguồn NC',
    thumb_url: normalizeImageUrl(item.thumb_url || item.poster_url),
    poster_url: normalizeImageUrl(item.poster_url || item.thumb_url),
    imdb_rating: 0,
    year: toNumber(item.year, new Date().getFullYear()),
    episodes: Math.max(total, current),
    current_episode: current,
    duration: 0,
    duration_text: '',
    quality: String(item.quality || 'HD'),
    age_rating: 'T13',
    is_series: Math.max(total, current) > 1,
    status: 'ongoing',
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    episodes_data: [],
    servers: [],
    lang: String(item.language || ''),
    lang_key: [],
    last_episodes: [],
  };
}

function mapKKMovie(raw: Record<string, unknown>, imageBaseUrl = OPHIM_IMAGE_BASE_URL): Movie {
  const movie = mapOPhimMovie(raw, imageBaseUrl);

  movie.servers = Array.isArray(movie.servers)
    ? movie.servers.map((server, index) => ({
        ...server,
        name: normalizeKKServerName(server.name || '', index),
      }))
    : movie.servers;

  return movie;
}

