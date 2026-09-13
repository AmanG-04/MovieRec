import { demoGenres, demoMovies, demoPage } from "./demo-data.js";
import type { Genre, MovieCard, MovieDetails, MoviePage, ProviderMovie } from "./types.js";

export class DemoProvider {
  genres(): Genre[] {
    return demoGenres;
  }

  discover(params: { page: number; genre?: number; year?: number; minRating?: number }): MoviePage {
    return this.page(demoPage(params.page, undefined, params.genre, params.year, params.minRating));
  }

  search(query: string, page: number): MoviePage {
    return this.page(demoPage(page, query));
  }

  details(id: number): MovieDetails {
    const movie = demoMovies.find((item) => item.id === id);
    if (!movie) throw new Error("Demo movie not found");
    return {
      ...this.mapCard(movie),
      runtime: 108,
      tagline: "A story worth staying for.",
      homepage: null,
      trailerUrl: null,
      cast: [
        { id: 9001, name: "Mara Vale", character: "Dr. Elena Ward", profileUrl: null },
        { id: 9002, name: "Jon Bell", character: "Theo", profileUrl: null },
        { id: 9003, name: "Samir Cole", character: "The Signal", profileUrl: null }
      ]
    };
  }

  recommendations(id: number): MovieCard[] {
    return demoMovies.filter((movie) => movie.id !== id).slice(0, 4).map((movie) => this.mapCard(movie));
  }

  private page(result: ReturnType<typeof demoPage>): MoviePage {
    return {
      page: result.page,
      totalPages: result.total_pages,
      totalResults: result.total_results,
      results: result.results.map((movie) => this.mapCard(movie))
    };
  }

  private mapCard(movie: ProviderMovie): MovieCard {
    const releaseDate = movie.release_date || null;
    return {
      id: movie.id,
      title: movie.title || "Untitled",
      overview: movie.overview || "No overview is available for this title yet.",
      posterUrl: null,
      backdropUrl: null,
      releaseDate,
      year: releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : null,
      rating: movie.vote_average || null,
      voteCount: movie.vote_count || 0,
      genres: (movie.genre_ids || []).map((id) => demoGenres.find((genre) => genre.id === id)?.name).filter((name): name is string => Boolean(name))
    };
  }
}
