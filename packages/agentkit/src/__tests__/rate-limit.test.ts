import { describe, it, expect } from "vitest";
import { RateLimiter } from "../rate-limit.js";

describe("RateLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }

    expect(limiter.currentCount).toBe(5);
  });

  it("tracks current count correctly", async () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });

    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();

    expect(limiter.currentCount).toBe(3);
  });

  it("cleans up old timestamps", async () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 50 });

    await limiter.acquire();
    await limiter.acquire();

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    expect(limiter.currentCount).toBe(0);
  });
});
