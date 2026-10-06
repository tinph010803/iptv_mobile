import { HT_LOCAL_SOURCES } from '@/lib/htLocalSources';
import { getMovieBySlug, getOfMoviesPaged } from '@/lib/ophim';
import { Movie } from '@/types/movie';

export async function getBilingualMoviesPaged(page: number = 1): Promise<{ movies: Movie[]; totalPages: number }> {
  const slugs = Object.keys(HT_LOCAL_SOURCES);
  const ofResult = await getOfMoviesPaged(page).catch(() => ({ movies: [] as Movie[], totalPages: 1 }));
  if (page > 1) return ofResult;

  const htResults = await Promise.allSettled(slugs.map((s) => getMovieBySlug(s)));
  const htMovies = htResults.flatMap((r) =>
    r.status === 'fulfilled' && r.value ? [r.value] : []
  );
  const seen = new Set<string>();
  const movies = [...ofResult.movies, ...htMovies].filter((movie) => {
    const key = String(movie.slug || movie.id || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { movies, totalPages: ofResult.totalPages };
}

export async function getBilingualMovies(page: number = 1): Promise<Movie[]> {
  const result = await getBilingualMoviesPaged(page);
  return result.movies;
}