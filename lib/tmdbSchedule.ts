const TMDB_KEY = 'dd4f0dce7b88b26dd4acfd94752b1cec'; // dùng chung key với lib/tmdbEpisodes.ts
const IMG = 'https://image.tmdb.org/t/p/';
const MAX_PER_DAY = 20;

export type ScheduleItem = {
    id: number;
    name: string;          // tên tiếng Việt
    originalName: string;
    poster: string;
    episode: string;
    slug: string;          // slug trong kho phimapi, rỗng nếu không tìm thấy
    titles: string[];      // các tên dùng để tìm trong kho
    year: number;
    group: 'KR' | 'CN' | 'US';
};

const GROUPS: { key: ScheduleItem['group']; countries: string; limit: number }[] = [
    { key: 'KR', countries: 'KR', limit: 9 },
    { key: 'CN', countries: 'CN', limit: 8 },
    { key: 'US', countries: 'US|GB', limit: 3 },
];

const dayCache = new Map<string, ScheduleItem[]>();
const detailCache = new Map<number, any>();
const seasonCache = new Map<string, any[]>();

const norm = (s: string) =>
    s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[\s\-_:.,!?'"()]/g, '');

function addDays(dateStr: string, n: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/* ---------- TMDB ---------- */

async function discover(dateStr: string, countries: string): Promise<any[]> {
    try {
        const url =
            `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}` +
            `&language=vi-VN&sort_by=popularity.desc` +
            `&air_date.gte=${dateStr}&air_date.lte=${dateStr}` +
            `&timezone=${encodeURIComponent('Asia/Ho_Chi_Minh')}` +
            `&with_origin_country=${encodeURIComponent(countries)}` +
            `&without_genres=10763,10767`; // bỏ tin tức và talk show
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json?.results) ? json.results : [];
    } catch {
        return [];
    }
}

async function getDetail(id: number): Promise<any | null> {
    if (detailCache.has(id)) return detailCache.get(id);
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&append_to_response=alternative_titles,translations`
        );
        if (!res.ok) return null;
        const json = await res.json();
        detailCache.set(id, json);
        return json;
    } catch {
        return null;
    }
}

async function getSeason(id: number, season: number): Promise<any[]> {
    const key = `${id}:${season}`;
    if (seasonCache.has(key)) return seasonCache.get(key)!;
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_KEY}`);
        if (!res.ok) return [];
        const json = await res.json();
        const eps = Array.isArray(json?.episodes) ? json.episodes : [];
        seasonCache.set(key, eps);
        return eps;
    } catch {
        return [];
    }
}

function pickSeason(detail: any, dateStr: string): number {
    const dates = [dateStr, addDays(dateStr, -1), addDays(dateStr, 1)];
    const cands = [detail?.next_episode_to_air, detail?.last_episode_to_air].filter(
        (e) => e?.season_number > 0
    );
    const near = cands.find((e) => dates.includes(e.air_date));
    if (near) return near.season_number;
    const seasons = (detail?.seasons ?? []).filter(
        (s: any) => s.season_number > 0 && s.air_date && s.air_date <= dateStr
    );
    if (seasons.length) return seasons[seasons.length - 1].season_number;
    return detail?.last_episode_to_air?.season_number || 1;
}

async function getEpisodeLabel(detail: any, id: number, dateStr: string): Promise<string> {
    if (!detail) return '';
    const season = pickSeason(detail, dateStr);
    const eps = await getSeason(id, season);

    let hit = eps.filter((e) => e.air_date === dateStr);
    if (hit.length === 0) {
        // lệch múi giờ: lấy tập phát ngày liền trước hoặc liền sau
        const near = eps.filter((e) => [addDays(dateStr, -1), addDays(dateStr, 1)].includes(e.air_date));
        if (near.length) hit = near.filter((e) => e.air_date === near[0].air_date);
    }

    let nums: number[] = hit.map((e) => e.episode_number).filter(Boolean);

    if (nums.length === 0) {
        const dates = [dateStr, addDays(dateStr, -1), addDays(dateStr, 1)];
        for (const ep of [detail?.next_episode_to_air, detail?.last_episode_to_air]) {
            if (ep?.episode_number && dates.includes(ep.air_date)) {
                nums = [ep.episode_number];
                break;
            }
        }
    }
    if (nums.length === 0) return '';

    nums.sort((a, b) => a - b);
    const label =
        nums.length === 1
            ? `Tập ${nums[0]}`
            : nums.length === 2
                ? `Tập ${nums[0]} & ${nums[1]}`
                : `Tập ${nums[0]} - ${nums[nums.length - 1]}`;
    return season > 1 ? `Mùa ${season} · ${label}` : label;
}

/* ---------- Kho phimapi + dịch tên ---------- */

async function searchStore(keyword: string): Promise<any[]> {
    try {
        const res = await fetch(
            `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=10`
        );
        const json = await res.json();
        return Array.isArray(json?.data?.items) ? json.data.items : [];
    } catch {
        return [];
    }
}

// Gom các tên có thể có của phim: bản dịch vi/en/zh/ko, tên gốc, tên khác
function collectTitles(row: any, detail: any): string[] {
    const out: string[] = [];
    const push = (t?: string) => {
        const s = String(t ?? '').trim();
        if (s && !out.includes(s)) out.push(s);
    };
    push(row.original_name);
    push(row.name);
    const trans: any[] = detail?.translations?.translations ?? [];
    for (const lang of ['vi', 'en', 'zh', 'ko']) {
        trans.filter((t) => t.iso_639_1 === lang).forEach((t) => push(t.data?.name));
    }
    (detail?.alternative_titles?.results ?? []).forEach((t: any) => push(t.title));
    return out.slice(0, 6);
}

function matchScore(item: any, keys: string[], year: number): number {
    const cands = [norm(item.origin_name ?? ''), norm(item.name ?? '')].filter(Boolean);
    const itemYear = Number(item.year) || 0;
    const yearOk = !!year && !!itemYear && Math.abs(itemYear - year) <= 1;
    let best = 0;
    for (const c of cands) {
        for (const k of keys) {
            if (!k) continue;
            if (c === k) best = Math.max(best, 100);
            else if (yearOk && Math.min(c.length, k.length) >= 3 && (c.includes(k) || k.includes(c))) {
                best = Math.max(best, 70);
            }
        }
    }
    return best > 0 && yearOk ? best + 20 : best;
}

async function findInStore(titles: string[], year: number): Promise<{ slug: string; name: string } | null> {
    const keywords = titles.filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 5);
    const keys = keywords.map(norm);
    let best: { score: number; item: any } | null = null;

    for (const kw of keywords) {
        if (!norm(kw)) continue;
        const items = await searchStore(kw);
        for (const item of items) {
            const score = matchScore(item, keys, year);
            if (score > 0 && (!best || score > best.score)) best = { score, item };
        }
        if (best && best.score >= 100) break; // đã khớp chắc chắn thì dừng
    }
    return best?.item?.slug
        ? { slug: best.item.slug, name: String(best.item.name ?? '').trim() }
        : null;
}

// Dịch dự phòng (endpoint không chính thức của Google)
async function translateToVi(text: string): Promise<string> {
    try {
        const res = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`
        );
        const json = await res.json();
        return (json?.[0] ?? []).map((seg: any) => seg?.[0] ?? '').join('').trim();
    } catch {
        return '';
    }
}

async function viTitle(row: any, store: { slug: string; name: string } | null): Promise<string> {
    if (store?.name) return store.name;                       // 1. tên trong kho phimapi
    const tmdbName = String(row.name ?? '').trim();
    const original = String(row.original_name ?? '').trim();
    if (tmdbName && tmdbName !== original) return tmdbName;   // 2. TMDB đã có tên tiếng Việt
    const translated = await translateToVi(original || tmdbName); // 3. dịch máy
    return translated || tmdbName || original;
}

/* ---------- Xuất ra ngoài ---------- */

export async function getTMDBSchedule(dateStr: string): Promise<ScheduleItem[]> {
    const cached = dayCache.get(dateStr);
    if (cached) return cached;

    const lists = await Promise.all(
        GROUPS.map(async (g) => {
            const rows = await discover(dateStr, g.countries);
            return rows.slice(0, g.limit).map((r) => ({ ...r, __group: g.key }));
        })
    );

    const merged = lists
        .flat()
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, MAX_PER_DAY);

    const items: ScheduleItem[] = await Promise.all(
        merged.map(async (s) => {
            const original = String(s.original_name ?? '');
            const detail = await getDetail(s.id);
            const titles = collectTitles(s, detail);
            const year = Number(String(s.first_air_date ?? '').slice(0, 4)) || 0;
            const store = await findInStore(titles, year);
            const [name, episode] = await Promise.all([
                viTitle(s, store),
                getEpisodeLabel(detail, s.id, dateStr),
            ]);
            const img = s.backdrop_path
                ? IMG + 'w500' + s.backdrop_path
                : s.poster_path
                    ? IMG + 'w342' + s.poster_path
                    : '';
            return {
                id: s.id,
                name,
                originalName: original,
                poster: img,
                episode,
                slug: store?.slug ?? '',
                titles,
                year,
                group: s.__group,
            };
        })
    );

    if (items.length > 0) dayCache.set(dateStr, items);
    return items;
}

export async function resolveSlugForItem(item: ScheduleItem): Promise<string | null> {
    const hit = await findInStore(item.titles, item.year);
    return hit?.slug ?? null;
}