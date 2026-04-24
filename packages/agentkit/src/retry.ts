export interface RetryOptions {
  /** Max number of retries (default: 3) */
  maxRetries: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
  /** Max delay in ms (default: 30000) */
  maxDelay: number;
  /** HTTP status codes that trigger retry (default: [429, 500, 502, 503, 504]) */
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/** Check if an error is retryable based on HTTP status */
function isRetryable(error: unknown, statuses: number[]): boolean {
  if (error instanceof Error) {
    // Check for HTTP status in error message (e.g., "API error (429): ...")
    const match = error.message.match(/\((\d{3})\)/);
    if (match) {
      return statuses.includes(parseInt(match[1], 10));
    }
  }
  return false;
}

/** Calculate delay with jitter */
function getDelay(attempt: number, options: RetryOptions): number {
  const delay =
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  const capped = Math.min(delay, options.maxDelay);
  // Add 0-25% jitter to prevent thundering herd
  const jitter = capped * Math.random() * 0.25;
  return capped + jitter;
}

/** Execute a function with retry logic */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries || !isRetryable(error, opts.retryableStatuses)) {
        throw error;
      }

      const delay = getDelay(attempt, opts);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
