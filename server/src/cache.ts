type Entry<T> = { value: T; expiresAt: number };

export class TtlCache {
  private entries = new Map<string, Entry<unknown>>();
  private pending = new Map<string, Promise<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async getOrSet<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const existing = this.pending.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const request = factory()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      })
      .finally(() => this.pending.delete(key));

    this.pending.set(key, request);
    return request;
  }
}
