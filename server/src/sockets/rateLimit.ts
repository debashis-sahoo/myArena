export type TakeResult = { ok: true } | { ok: false; retryAfterMs: number };

/** Token bucket: `capacity` burst, refilled at `refillPerSec`. */
export class TokenBucket {
  private tokens: number;
  private last = Date.now();
  lastUsed = Date.now();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {
    this.tokens = capacity;
  }

  take(): TakeResult {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refillPerSec);
    this.last = now;
    this.lastUsed = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { ok: true };
    }
    return { ok: false, retryAfterMs: Math.ceil(((1 - this.tokens) / this.refillPerSec) * 1000) };
  }
}

/** One bucket per key (for example client IP), pruned when idle. */
export class KeyedLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {
    this.timer = setInterval(() => this.prune(), 5 * 60_000);
    this.timer.unref();
  }

  take(key: string): TakeResult {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(this.capacity, this.refillPerSec);
      this.buckets.set(key, bucket);
    }
    return bucket.take();
  }

  private prune(): void {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [key, bucket] of this.buckets) if (bucket.lastUsed < cutoff) this.buckets.delete(key);
  }
}
