export type MovieCard = {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  year: number | null;
  rating: number | null;
  voteCount: number;
  genres: string[];
};

export type MovieDetails = MovieCard & {
  runtime: number | null;
  tagline: string | null;
  homepage: string | null;
  trailerUrl: string | null;
  cast: Array<{ id: number; name: string; character: string; profileUrl: string | null }>;
};

export type MoviePage = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MovieCard[];
};

export type Genre = { id: number; name: string };

export type WishlistItem = MovieCard & { addedAt: string };

export type ProviderMovie = {
  id: number;
  title?: string;
  name?: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  runtime?: number | null;
  tagline?: string | null;
  homepage?: string | null;
  videos?: { results?: Array<{ key: string; site: string; type: string }> };
  credits?: { cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }> };
};
