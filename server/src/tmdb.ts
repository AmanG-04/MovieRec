import type { Genre, MovieCard, MovieDetails, MoviePage, ProviderMovie } from "./types.js";

const API_ROOT = "https://api.themoviedb.org/3";
const IMAGE_ROOT = "https://image.tmdb.org/t/p";

type TmdbPage = { page: number; total_pages: number; total_results: number; results: ProviderMovie[] };

export class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TmdbError";
  }
}

export class TmdbProvider {
  constructor(private readonly apiKey: string) {}

  private async request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const query = new URLSearchParams({ api_key: this.apiKey, language: "en-US" });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }

    const url = `${API_ROOT}${path}?${query}`;
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
        if (!response.ok) {
          throw new TmdbError(response.status, `TMDb returned ${response.status}`);
        }
        return response.json() as Promise<T>;
      } catch (error) {
        if (error instanceof TmdbError) throw error;
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    const message = lastError instanceof Error ? lastError.message : "TMDb request failed";
    throw new TmdbError(503, message);
  }

  async genres(): Promise<Genre[]> {
    const result = await this.request<{ genres: Genre[] }>("/genre/movie/list");
    return result.genres;
  }

  async discover(params: { page: number; sort: string; genre?: number; year?: number; minRating?: number }): Promise<MoviePage> {
    const result = await this.request<TmdbPage>("/discover/movie", {
      page: params.page,
      sort_by: params.sort,
      with_genres: params.genre,
      primary_release_year: params.year,
      "vote_average.gte": params.minRating,
      include_adult: "false"
    });
    return this.page(result);
  }

  async search(query: string, page: number): Promise<MoviePage> {
    const result = await this.request<TmdbPage>("/search/movie", {
      query,
      page,
      include_adult: "false"
    });
    return this.page(result);
  }

  async details(id: number): Promise<MovieDetails> {
    const movie = await this.request<ProviderMovie>(`/movie/${id}`, { append_to_response: "videos,credits" });
    return this.mapDetails(movie);
  }

  async recommendations(id: number): Promise<MovieCard[]> {
    const result = await this.request<TmdbPage>(`/movie/${id}/recommendations`, { page: 1 });
    return result.results.slice(0, 12).map((movie) => this.mapCard(movie));
  }

  private page(result: TmdbPage): MoviePage {
    return {
      page: result.page,
      totalPages: Math.min(result.total_pages, 500),
      totalResults: result.total_results,
      results: result.results.filter((movie) => movie.id && (movie.title || movie.name)).map((movie) => this.mapCard(movie))
    };
  }

  private mapCard(movie: ProviderMovie): MovieCard {
    const releaseDate = movie.release_date || movie.first_air_date || null;
    return {
      id: movie.id,
      title: movie.title || movie.name || "Untitled",
      overview: movie.overview || "No overview is available for this title yet.",
      posterUrl: movie.poster_path ? `${IMAGE_ROOT}/w500${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path ? `${IMAGE_ROOT}/w1280${movie.backdrop_path}` : null,
      releaseDate,
      year: releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : null,
      rating: typeof movie.vote_average === "number" && movie.vote_average > 0 ? Math.round(movie.vote_average * 10) / 10 : null,
      voteCount: movie.vote_count || 0,
      genres: movie.genres?.map((genre) => genre.name) || []
    };
  }

  private mapDetails(movie: ProviderMovie): MovieDetails {
    const card = this.mapCard(movie);
    const trailer = movie.videos?.results?.find((video) => video.site === "YouTube" && video.type === "Trailer");
    return {
      ...card,
      runtime: movie.runtime || null,
      tagline: movie.tagline || null,
      homepage: movie.homepage || null,
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
      cast: (movie.credits?.cast || []).slice(0, 8).map((person) => ({
        id: person.id,
        name: person.name,
        character: person.character || "",
        profileUrl: person.profile_path ? `${IMAGE_ROOT}/w185${person.profile_path}` : null
      }))
    };
  }
}
