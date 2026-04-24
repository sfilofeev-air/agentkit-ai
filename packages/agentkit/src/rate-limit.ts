export interface RateLimitOptions {
  /** Max requests per window (default: 60) */
  maxRequests: number;
  /** Window size in ms (default: 60000 = 1 minute) */
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 60,
  windowMs: 60000,
};

/**
 * Simple sliding window rate limiter.
 * Tracks request timestamps and delays if limit is exceeded.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private options: RateLimitOptions;

  constructor(options: Partial<RateLimitOptions> = {}) {
    this.options = { ...DEFAULT_RATE_LIMIT, ...options };
  }

  /** Wait if rate limit would be exceeded, then record the request */
  async acquire(): Promise<void> {
    this.cleanup();

    if (this.timestamps.length >= this.options.maxRequests) {
      const oldest = this.timestamps[0];
      const waitUntil = oldest + this.options.windowMs;
      const delay = waitUntil - Date.now();

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        this.cleanup();
      }
    }

    this.timestamps.push(Date.now());
  }

  /** Remove timestamps outside the current window */
  private cleanup(): void {
    const cutoff = Date.now() - this.options.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) {
      this.timestamps.shift();
    }
  }

  /** Current number of requests in the window */
  get currentCount(): number {
    this.cleanup();
    return this.timestamps.length;
  }
}
