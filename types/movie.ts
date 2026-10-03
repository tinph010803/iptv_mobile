export interface Movie {
  id: string;
  slug?: string;
  title: string;
  title_en: string;
  description: string;
  poster_url: string;
  thumb_url: string;
  imdb_rating: number;
  year: number;
  episodes: number;
  current_episode: number;
  duration: number;
  duration_text: string;
  quality: string;
  age_rating: string;
  is_series: boolean;
  status?: 'completed' | 'ongoing' | 'trailer' | string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  stream_url?: string;
  trailer_url?: string;
  episodes_data?: Array<{ name: string; link_embed: string; link_m3u8: string }>;
  servers?: Array<{ name: string; episodes: Array<{ name: string; link_embed: string; link_m3u8: string }> }>;
  genres?: string[];
  country?: string;
  director?: string;
  actors?: string[];
  tmdb_id?: number;
  tmdb_type?: 'movie' | 'tv';
  lang?: string;
  lang_key?: string[];
  last_episodes?: Array<{ server_name: string; name: string; is_ai?: boolean }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  movie_id: string;
  movie?: Movie;
  created_at: string;
}
