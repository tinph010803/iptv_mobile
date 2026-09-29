import { HT_LOCAL_SOURCES } from '@/lib/htLocalSources';
import { getMovieBySlug } from '@/lib/ophim';
import { Movie } from '@/types/movie';

export async function getBilingualMovies(): Promise<Movie[]> {
  const slugs = Object.keys(HT_LOCAL_SOURCES);
  const results = await Promise.allSettled(slugs.map((s) => getMovieBySlug(s)));
  return results.flatMap((r) =>
    r.status === 'fulfilled' && r.value ? [r.value] : []
  );
}