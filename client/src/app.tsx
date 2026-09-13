import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { api } from "./api";
import type { MovieCard, MovieDetails } from "../../server/src/types";

const SORTS = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "vote_average.desc", label: "Highest rated" },
  { value: "primary_release_date.desc", label: "Newest releases" },
  { value: "revenue.desc", label: "Biggest hits" }
];

function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DiscoverPage />} />
        <Route path="/movie/:id" element={<DetailsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
      </Route>
    </Routes>
  );
}

function Shell() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="wordmark" to="/">
          <span className="wordmark-mark">R</span>
          <span>reelmark</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/">Discover</Link>
          <Link to="/wishlist">Wishlist</Link>
        </nav>
        <span className="header-note">A considered watchlist</span>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>Reelmark / 2025</span>
        <span>Movie data provided by TMDb</span>
      </footer>
    </div>
  );
}

function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const page = Number(params.get("page") || 1);
  const isSearch = query.trim().length >= 2;
  const filters = {
    sort: params.get("sort") || "popularity.desc",
    genre: params.get("genre") || "",
    year: params.get("year") || "",
    minRating: params.get("rating") || ""
  };
  const genres = useQuery({ queryKey: ["genres"], queryFn: api.genres, staleTime: 86_400_000 });
  const movies = useQuery({
    queryKey: [isSearch ? "search" : "discover", query, page, filters],
    queryFn: () => isSearch
      ? api.search(query, page)
      : api.discover(new URLSearchParams({ page: String(page), sort: filters.sort, ...(filters.genre ? { genre: filters.genre } : {}), ...(filters.year ? { year: filters.year } : {}), ...(filters.minRating ? { minRating: filters.minRating } : {}) }).toString()),
    placeholderData: (previous) => previous
  });

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">The evening starts here</p>
          <h1>Find a film<br /><em>worth remembering.</em></h1>
          <p className="hero-description">A quieter way to discover the movies that stay with you. Browse by mood, acclaim, or simply see what is waiting.</p>
          <form className="search-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); update("q", String(form.get("q") || "")); }}>
            <span className="search-icon">⌕</span>
            <input name="q" defaultValue={query} placeholder="Search films, actors, directors..." aria-label="Search films" />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <span>Curated</span>
          <strong>01</strong>
          <span>Discover</span>
        </div>
      </section>

      <section className="content-section browse-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isSearch ? "Your search" : "The collection"}</p>
            <h2>{isSearch ? `Results for “${query}”` : "Start exploring"}</h2>
          </div>
          <span className="result-count">{movies.data ? `${movies.data.totalResults.toLocaleString()} titles` : "Loading titles..."}</span>
        </div>
        <div className="filters" aria-label="Movie filters">
          <select value={filters.sort} onChange={(event) => update("sort", event.target.value)} aria-label="Sort movies">
            {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
          <select value={filters.genre} onChange={(event) => update("genre", event.target.value)} aria-label="Filter by genre">
            <option value="">All genres</option>
            {genres.data?.map((genre) => <option value={genre.id} key={genre.id}>{genre.name}</option>)}
          </select>
          <select value={filters.year} onChange={(event) => update("year", event.target.value)} aria-label="Filter by year">
            <option value="">Any year</option>
            {Array.from({ length: 12 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={filters.minRating} onChange={(event) => update("rating", event.target.value)} aria-label="Filter by minimum rating">
            <option value="">Any rating</option>
            {[9, 8, 7, 6].map((rating) => <option value={rating} key={rating}>{rating}+ rating</option>)}
          </select>
        </div>
        {movies.isError ? <ErrorState message={movies.error.message} onRetry={() => movies.refetch()} /> : movies.isPending ? <MovieGridSkeleton /> : movies.data?.results.length ? <MovieGrid movies={movies.data.results} /> : <EmptyState />}
        {movies.data && movies.data.totalPages > 1 && <Pagination page={page} totalPages={movies.data.totalPages} onChange={(next) => { const nextParams = new URLSearchParams(params); nextParams.set("page", String(next)); setParams(nextParams); window.scrollTo({ top: 500, behavior: "smooth" }); }} />}
      </section>
    </div>
  );
}

function MovieGrid({ movies }: { movies: MovieCard[] }) {
  return <div className="movie-grid">{movies.map((movie) => <MovieCardView movie={movie} key={movie.id} />)}</div>;
}

function MovieCardView({ movie }: { movie: MovieCard }) {
  const queryClient = useQueryClient();
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: api.wishlist });
  const saved = wishlist.data?.some((item) => item.id === movie.id) || false;
  const mutation = useMutation({
    mutationFn: () => saved ? api.removeWishlist(movie.id) : api.addWishlist(movie),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] })
  });
  return (
    <article className="movie-card">
      <Link to={`/movie/${movie.id}`} className="poster-link">
        {movie.posterUrl ? <img src={movie.posterUrl} alt={`${movie.title} poster`} loading="lazy" /> : <PosterFallback title={movie.title} />}
        <span className="card-rating">{movie.rating ? movie.rating.toFixed(1) : "NR"}</span>
      </Link>
      <div className="card-info">
        <div>
          <h3><Link to={`/movie/${movie.id}`}>{movie.title}</Link></h3>
          <p>{movie.year || "Year unknown"}</p>
        </div>
        <button className={`save-button ${saved ? "saved" : ""}`} onClick={() => mutation.mutate()} aria-label={saved ? `Remove ${movie.title} from wishlist` : `Add ${movie.title} to wishlist`} disabled={mutation.isPending}>{saved ? "♥" : "♡"}</button>
      </div>
    </article>
  );
}

function DetailsPage() {
  const { id = "" } = useParams();
  const movie = useQuery({ queryKey: ["movie", id], queryFn: () => api.details(id) });
  const recommendations = useQuery({ queryKey: ["recommendations", id], queryFn: () => api.recommendations(id), enabled: Boolean(movie.data) });
  if (movie.isPending) return <div className="page-state"><LoadingSpinner /><p>Finding the details...</p></div>;
  if (movie.isError || !movie.data) return <ErrorState message={movie.error?.message || "This film could not be found."} onRetry={() => movie.refetch()} />;
  return <MovieDetailsView movie={movie.data} recommendations={recommendations.data || []} />;
}

function MovieDetailsView({ movie, recommendations }: { movie: MovieDetails; recommendations: MovieCard[] }) {
  const queryClient = useQueryClient();
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: api.wishlist });
  const saved = wishlist.data?.some((item) => item.id === movie.id) || false;
  const mutation = useMutation({ mutationFn: () => saved ? api.removeWishlist(movie.id) : api.addWishlist(movie), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }) });
  return (
    <div className="details-page">
      <section className="detail-hero" style={movie.backdropUrl ? { backgroundImage: `linear-gradient(90deg, var(--ink) 8%, rgba(17,16,14,.82) 45%, rgba(17,16,14,.28)), url(${movie.backdropUrl})` } : undefined}>
        <Link to="/" className="back-link">← Back to discovery</Link>
        <div className="detail-content">
          <div className="detail-poster">{movie.posterUrl ? <img src={movie.posterUrl} alt={`${movie.title} poster`} /> : <PosterFallback title={movie.title} />}</div>
          <div className="detail-copy">
            <p className="eyebrow">{movie.genres.join("  /  ") || "Feature film"}</p>
            <h1>{movie.title}</h1>
            {movie.tagline && <p className="tagline">{movie.tagline}</p>}
            <div className="detail-meta"><span>{movie.year || "—"}</span><span>{movie.runtime ? `${movie.runtime} min` : "Runtime unknown"}</span><span>★ {movie.rating?.toFixed(1) || "NR"}</span></div>
            <p className="detail-overview">{movie.overview}</p>
            <div className="detail-actions"><button className={`primary-button ${saved ? "button-saved" : ""}`} onClick={() => mutation.mutate()}>{saved ? "♥  In your wishlist" : "♡  Add to wishlist"}</button>{movie.trailerUrl && <a className="text-button" href={movie.trailerUrl} target="_blank" rel="noreferrer">Watch trailer ↗</a>}</div>
          </div>
        </div>
      </section>
      {movie.cast.length > 0 && <section className="content-section cast-section"><div className="section-heading"><div><p className="eyebrow">The people</p><h2>Cast</h2></div></div><div className="cast-list">{movie.cast.map((person) => <div className="cast-member" key={person.id}>{person.profileUrl ? <img src={person.profileUrl} alt={person.name} loading="lazy" /> : <div className="cast-placeholder">{person.name.charAt(0)}</div>}<strong>{person.name}</strong><span>{person.character}</span></div>)}</div></section>}
      {recommendations.length > 0 && <section className="content-section"><div className="section-heading"><div><p className="eyebrow">If you liked this</p><h2>More to explore</h2></div></div><MovieGrid movies={recommendations} /></section>}
    </div>
  );
}

function WishlistPage() {
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: api.wishlist });
  return <section className="content-section wishlist-page"><div className="section-heading"><div><p className="eyebrow">Your private shelf</p><h1>Wishlist</h1></div><span className="result-count">{wishlist.data?.length || 0} saved</span></div>{wishlist.isPending ? <MovieGridSkeleton /> : wishlist.data?.length ? <MovieGrid movies={wishlist.data} /> : <div className="empty-wishlist"><span className="empty-icon">♡</span><h2>Nothing saved yet</h2><p>When a film catches your eye, save it here for later.</p><Link className="primary-button" to="/">Explore films</Link></div>}</section>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <div className="pagination"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>← Previous</button><span>Page <strong>{page}</strong> of {Math.min(totalPages, 500)}</span><button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</button></div>;
}

function PosterFallback({ title }: { title: string }) { return <div className="poster-fallback"><span>REELMARK</span><strong>{title}</strong></div>; }
function LoadingSpinner() { return <span className="loading-spinner" aria-label="Loading" />; }
function MovieGridSkeleton() { return <div className="movie-grid">{Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-poster" /><div className="skeleton-line" /><div className="skeleton-short" /></div>)}</div>; }
function EmptyState() { return <div className="empty-state"><span className="empty-icon">⌕</span><h2>No films found</h2><p>Try a different search or loosen your filters.</p></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="empty-state error-state"><span className="empty-icon">!</span><h2>Something went wrong</h2><p>{message}</p><button className="primary-button" onClick={onRetry}>Try again</button></div>; }

export { App };
