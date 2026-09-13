import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { TtlCache } from "./cache.js";
import { config } from "./config.js";
import { DemoProvider } from "./demo-provider.js";
import { TmdbError, TmdbProvider } from "./tmdb.js";
import type { MovieCard } from "./types.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  sort: z.string().regex(/^[a-z_]+\.(asc|desc)$/).default("popularity.desc"),
  genre: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
  minRating: z.coerce.number().min(0).max(10).optional()
});

const searchSchema = z.object({
  q: z.string().trim().min(2).max(100),
  page: z.coerce.number().int().min(1).max(500).default(1)
});

const wishlistSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(300),
  overview: z.string().max(2000).default(""),
  posterUrl: z.string().url().nullable().default(null),
  backdropUrl: z.string().url().nullable().default(null),
  releaseDate: z.string().nullable().default(null),
  year: z.number().int().nullable().default(null),
  rating: z.number().nullable().default(null),
  voteCount: z.number().int().default(0),
  genres: z.array(z.string()).default([])
});

export function buildApp() {
  const app = Fastify({ logger: true });
  const provider = new TmdbProvider(config.TMDB_API_KEY);
  const demoProvider = new DemoProvider();
  const prisma = new PrismaClient();
  const cache = new TtlCache();

  app.register(cors, { origin: config.CLIENT_ORIGIN });
  app.register(sensible);

  app.get("/api/health", async () => ({ status: "ok" }));

  app.get("/api/genres", async () => cache.getOrSet("genres", 86_400_000, async () => {
    try {
      return await provider.genres();
    } catch (error) {
      if (config.TMDB_DEMO_FALLBACK && error instanceof TmdbError && error.status === 503) return demoProvider.genres();
      throw error;
    }
  }));

  app.get("/api/movies/discover", async (request) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid discovery filters");
    const params = parsed.data;
    const key = `discover:${JSON.stringify(params)}`;
    return cache.getOrSet(key, 180_000, async () => {
      try {
        return await provider.discover(params);
      } catch (error) {
        if (config.TMDB_DEMO_FALLBACK && error instanceof TmdbError && error.status === 503) return demoProvider.discover(params);
        throw error;
      }
    });
  });

  app.get("/api/movies/search", async (request) => {
    const parsed = searchSchema.safeParse(request.query);
    if (!parsed.success) throw app.httpErrors.badRequest("Search must contain at least two characters");
    const { q, page } = parsed.data;
    return cache.getOrSet(`search:${q.toLowerCase()}:${page}`, 180_000, async () => {
      try {
        return await provider.search(q, page);
      } catch (error) {
        if (config.TMDB_DEMO_FALLBACK && error instanceof TmdbError && error.status === 503) return demoProvider.search(q, page);
        throw error;
      }
    });
  });

  app.get("/api/movies/:id", async (request) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) throw app.httpErrors.badRequest("Invalid movie id");
    return cache.getOrSet(`movie:${id}`, 1_800_000, async () => {
      try {
        return await provider.details(id);
      } catch (error) {
        if (config.TMDB_DEMO_FALLBACK && error instanceof TmdbError && error.status === 503) return demoProvider.details(id);
        throw error;
      }
    });
  });

  app.get("/api/movies/:id/recommendations", async (request) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) throw app.httpErrors.badRequest("Invalid movie id");
    return cache.getOrSet(`recommendations:${id}`, 1_800_000, async () => {
      try {
        return await provider.recommendations(id);
      } catch (error) {
        if (config.TMDB_DEMO_FALLBACK && error instanceof TmdbError && error.status === 503) return demoProvider.recommendations(id);
        throw error;
      }
    });
  });

  app.get("/api/wishlist", async () => {
    const items = await prisma.wishlistItem.findMany({ orderBy: { addedAt: "desc" } });
    return items.map((item) => ({
      id: item.movieId,
      title: item.title,
      overview: "",
      posterUrl: item.posterPath,
      backdropUrl: null,
      releaseDate: item.releaseDate,
      year: item.releaseDate ? Number.parseInt(item.releaseDate.slice(0, 4), 10) : null,
      rating: item.voteAverage,
      voteCount: 0,
      genres: [],
      addedAt: item.addedAt.toISOString()
    }));
  });

  app.post("/api/wishlist", async (request, reply) => {
    const parsed = wishlistSchema.safeParse(request.body);
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid wishlist item");
    const movie = parsed.data;
    const item = await prisma.wishlistItem.upsert({
      where: { movieId: movie.id },
      update: { title: movie.title, posterPath: movie.posterUrl, releaseDate: movie.releaseDate, voteAverage: movie.rating },
      create: { movieId: movie.id, title: movie.title, posterPath: movie.posterUrl, releaseDate: movie.releaseDate, voteAverage: movie.rating }
    });
    return reply.code(201).send({ id: item.movieId, addedAt: item.addedAt.toISOString() });
  });

  app.delete("/api/wishlist/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) throw app.httpErrors.badRequest("Invalid movie id");
    await prisma.wishlistItem.deleteMany({ where: { movieId: id } });
    return reply.code(204).send();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof TmdbError) {
      const status = error.status === 404 ? 404 : error.status === 429 ? 429 : 503;
      return reply.code(status).send({ error: { code: status === 429 ? "UPSTREAM_RATE_LIMITED" : status === 404 ? "NOT_FOUND" : "UPSTREAM_UNAVAILABLE", message: status === 429 ? "The movie service is rate-limited. Please try again shortly." : status === 404 ? "Movie not found." : "Movie information is temporarily unavailable. Please try again." } });
    }
    request.log.error(error);
    const statusCode = error instanceof Error && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    const status = statusCode >= 400 ? statusCode : 500;
    return reply.code(status).send({ error: { code: status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR", message: status === 400 ? message : "Something went wrong. Please try again." } });
  });

  app.addHook("onClose", async () => prisma.$disconnect());
  return app;
}
