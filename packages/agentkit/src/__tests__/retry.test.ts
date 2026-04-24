import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../retry.js";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("API error (429): rate limited"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, {
      initialDelay: 1,
      maxRetries: 3,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws on non-retryable error immediately", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("API error (401): unauthorized"));

    await expect(
      withRetry(fn, { initialDelay: 1, maxRetries: 3 })
    ).rejects.toThrow("unauthorized");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("API error (500): internal error"));

    await expect(
      withRetry(fn, { initialDelay: 1, maxRetries: 2 })
    ).rejects.toThrow("internal error");

    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("retries on 502, 503, 504 errors", async () => {
    for (const status of [502, 503, 504]) {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error(`API error (${status}): bad gateway`))
        .mockResolvedValue("recovered");

      const result = await withRetry(fn, { initialDelay: 1 });
      expect(result).toBe("recovered");
    }
  });

  it("does not retry non-Error throws", async () => {
    const fn = vi.fn().mockRejectedValue("string error");

    await expect(
      withRetry(fn, { initialDelay: 1, maxRetries: 3 })
    ).rejects.toBe("string error");

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
