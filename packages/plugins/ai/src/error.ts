import type { Tempo } from '@magmacomputing/tempo';

/**
 * ## TempoAiError
 * A specialized Error thrown during AI-driven parsing when network fetches fail, 
 * timeouts occur, or rate limits are exceeded.
 */
export class TempoAiError extends Error {
  /** HTTP Status Code (e.g., 429, 500) */
  #code: number;
  /** A Tempo instance representing the rate limit reset time (extracted from Headers) */
  #retryAt?: Tempo | undefined;

  constructor(message: string, code: number, retryAt?: Tempo) {
    super(message);
    this.name = 'TempoAiError';
    this.#code = code;
    this.#retryAt = retryAt;
  }

  get code(): number {
    return this.#code;
  }

  get retryAt(): Tempo | undefined {
    return this.#retryAt;
  }
}
