import type { Genre, ProviderMovie } from "./types.js";

export const demoGenres: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" }
];

export const demoMovies: ProviderMovie[] = [
  { id: 8100, title: "Inception", overview: "A skilled extractor enters the dreams of others for a final impossible job.", release_date: "2010-07-16", vote_average: 8.4, vote_count: 36000, genre_ids: [878, 28, 53] },
  { id: 8101, title: "The Incredible Hulk", overview: "A scientist searches for a cure while trying to control the force inside him.", release_date: "2008-06-13", vote_average: 6.2, vote_count: 12000, genre_ids: [878, 28] },
  { id: 8000, title: "The Last Signal", overview: "A radio astronomer hears a message that should not exist and has one night to prove it is real.", release_date: "2024-10-04", vote_average: 8.4, vote_count: 1820, genre_ids: [878, 53] },
  { id: 8001, title: "After the Rain", overview: "Two strangers share one long walk through a city learning how to begin again.", release_date: "2023-06-16", vote_average: 7.9, vote_count: 968, genre_ids: [18, 35] },
  { id: 8002, title: "The Quiet House", overview: "A family returns to an inherited house where every room remembers something different.", release_date: "2024-02-09", vote_average: 7.7, vote_count: 1240, genre_ids: [27, 53] },
  { id: 8003, title: "Northbound", overview: "A reluctant guide leads a group across a frozen wilderness to find a missing friend.", release_date: "2022-12-02", vote_average: 8.1, vote_count: 2150, genre_ids: [12, 18] },
  { id: 8004, title: "Small Hours", overview: "A night-shift baker discovers a second life in the stories of the people who visit before dawn.", release_date: "2025-01-17", vote_average: 7.6, vote_count: 740, genre_ids: [18, 35] },
  { id: 8005, title: "Orbiters", overview: "Three engineers stranded above Earth must decide what they are willing to leave behind.", release_date: "2023-09-22", vote_average: 8.0, vote_count: 1875, genre_ids: [878, 18] },
  { id: 8006, title: "The Long Game", overview: "A retired player returns to the court to coach a team that has forgotten how to lose together.", release_date: "2021-04-30", vote_average: 7.4, vote_count: 612, genre_ids: [18] },
  { id: 8007, title: "Paper Kingdom", overview: "A young cartographer finds a map that redraws itself every time someone tells a lie.", release_date: "2024-07-12", vote_average: 7.8, vote_count: 1335, genre_ids: [14, 12] },
  { id: 8008, title: "Static Bloom", overview: "A musician turns a broken transmitter into an unexpected connection with a distant voice.", release_date: "2022-08-19", vote_average: 7.5, vote_count: 521, genre_ids: [18, 878] },
  { id: 8009, title: "Night Market", overview: "A food critic follows a handwritten menu through the city's hidden after-hours kitchens.", release_date: "2025-03-14", vote_average: 7.3, vote_count: 440, genre_ids: [35, 18] },
  { id: 8010, title: "Red Meridian", overview: "A rescue pilot crosses a lawless frontier to bring home the crew that saved her life.", release_date: "2020-11-06", vote_average: 7.2, vote_count: 920, genre_ids: [28, 12] },
  { id: 8011, title: "The Orchard", overview: "When an old orchard blooms out of season, a town gathers to uncover what happened there.", release_date: "2023-10-13", vote_average: 7.9, vote_count: 1102, genre_ids: [18, 14] }
];

export function demoPage(page: number, query?: string, genre?: number, year?: number, minRating?: number): { page: number; total_pages: number; total_results: number; results: ProviderMovie[] } {
  const normalizedQuery = query?.toLowerCase().trim();
  const filtered = demoMovies.filter((movie) => {
    const matchesQuery = !normalizedQuery || movie.title?.toLowerCase().includes(normalizedQuery);
    const matchesGenre = !genre || movie.genre_ids?.includes(genre);
    const matchesYear = !year || movie.release_date?.startsWith(String(year));
    const matchesRating = minRating === undefined || (movie.vote_average || 0) >= minRating;
    return matchesQuery && matchesGenre && matchesYear && matchesRating;
  });
  const pageSize = 8;
  return { page, total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)), total_results: filtered.length, results: filtered.slice((page - 1) * pageSize, page * pageSize) };
}
