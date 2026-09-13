import { z } from "zod";

const envSchema = z.object({
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  TMDB_DEMO_FALLBACK: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("file:./dev.db")
});

export const config = envSchema.parse({
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  TMDB_DEMO_FALLBACK: process.env.TMDB_DEMO_FALLBACK,
  PORT: process.env.PORT,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL
});
