const TMDB_KEY = 'dd4f0dce7b88b26dd4acfd94752b1cec'; // dùng chung key với lib/tmdb.ts
const IMG = 'https://image.tmdb.org/t/p/w500';

export type EpisodeMeta = { name: string; overview: string; still: string; runtime: number };
export type EpisodeMetaMap = Record<number, EpisodeMeta>;

async function fetchSeason(tvId: number, season: number, lang: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}/season/${season}?api_key=${TMDB_KEY}&language=${lang}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.episodes) ? json.episodes : [];
  } catch {
    return [];
  }
}

// Dịch dự phòng cho tập chưa có mô tả tiếng Việt (endpoint không chính thức của Google)
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

export async function getTMDBEpisodeMeta(tvId: number, season = 1): Promise<EpisodeMetaMap> {
  const [vi, en] = await Promise.all([
    fetchSeason(tvId, season, 'vi-VN'),
    fetchSeason(tvId, season, 'en-US'),
  ]);
  const enByNum = new Map<number, any>(en.map((e) => [e.episode_number, e]));
  const base = vi.length > 0 ? vi : en;
  const out: EpisodeMetaMap = {};

  await Promise.all(
    base.map(async (ep) => {
      const enEp = enByNum.get(ep.episode_number);
      let overview = String(ep.overview ?? '').trim();
      if (!overview && enEp?.overview) overview = await translateToVi(enEp.overview);
      const still = ep.still_path || enEp?.still_path;
      const isGeneric = (n?: string) => !n || /^(tập|episode)\s*\d+$/i.test(String(n).trim());
         let name = String(ep.name ?? '').trim();
      if (isGeneric(name)) {
        if (isGeneric(enEp?.name)) {
          name = '';
        } else {
          const enName = String(enEp.name).trim();
          name = (await translateToVi(enName)) || enName;
        }
      }
      out[ep.episode_number] = {
        name,
        overview,
        still: still ? IMG + still : '',
        runtime: ep.runtime || enEp?.runtime || 0,
      };
    })
  );
  return out;
}