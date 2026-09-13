import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache.js";

describe("TtlCache", () => {
  it("returns cached values and deduplicates simultaneous requests", async () => {
    const cache = new TtlCache();
    const factory = vi.fn(async () => "movie data");
    const [first, second] = await Promise.all([
      cache.getOrSet("movie:1", 10_000, factory),
      cache.getOrSet("movie:1", 10_000, factory)
    ]);

    expect(first).toBe("movie data");
    expect(second).toBe("movie data");
    expect(factory).toHaveBeenCalledOnce();
    await cache.getOrSet("movie:1", 10_000, factory);
    expect(factory).toHaveBeenCalledOnce();
  });

  it("expires values after their ttl", async () => {
    vi.useFakeTimers();
    const cache = new TtlCache();
    const factory = vi.fn(async () => Math.random());
    const first = await cache.getOrSet("key", 100, factory);
    vi.advanceTimersByTime(101);
    const second = await cache.getOrSet("key", 100, factory);

    expect(second).not.toBe(first);
    expect(factory).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
