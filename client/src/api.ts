import type { Genre, MovieCard, MovieDetails, MoviePage, WishlistItem } from "../../server/src/types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || "The request could not be completed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  genres: () => request<Genre[]>("/genres"),
  discover: (params: string) => request<MoviePage>(`/movies/discover?${params}`),
  search: (query: string, page: number) => request<MoviePage>(`/movies/search?q=${encodeURIComponent(query)}&page=${page}`),
  details: (id: string) => request<MovieDetails>(`/movies/${id}`),
  recommendations: (id: string) => request<MovieCard[]>(`/movies/${id}/recommendations`),
  wishlist: () => request<WishlistItem[]>("/wishlist"),
  addWishlist: (movie: MovieCard) => request<{ id: number }>("/wishlist", { method: "POST", body: JSON.stringify(movie) }),
  removeWishlist: (id: number) => request<void>(`/wishlist/${id}`, { method: "DELETE" })
};
