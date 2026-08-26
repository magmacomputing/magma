import type { Tempo } from '@magmacomputing/tempo';

/**
 * ## TempoAiError
 * A specialized Error thrown during AI-driven operations when network fetches fail,
 * timeouts occur, or rate limits are exceeded.
 */
export class TempoAiError extends Error {
  /** HTTP Status Code (e.g., 429, 500) */
  #code: number;
  /** A Tempo instance representing the rate limit reset time (extracted from Headers) */
  #retryAt?: Tempo | undefined;

	/**
	 * Creates a new TempoAiError instance.
	 *
	 * @param message - Human-readable error message
	 * @param code - HTTP status code indicating the error type
	 * @param retryAt - Optional Tempo instance representing when to retry (for rate limits)
	 * @param options - Standard Error options (e.g., cause)
	 */
	constructor(message: string, code: number, retryAt?: Tempo, options?: ErrorOptions) {
		super(message, options);
		this.name = 'TempoAiError';
		this.#code = code;
		this.#retryAt = retryAt;
	}

	/**
	 * Gets the HTTP status code for this error.
	 *
	 * @returns The HTTP status code
	 */
  get code(): number {
    return this.#code;
  }

	/**
	 * Gets the HTTP status code for this error (alias for `code`).
	 *
	 * @returns The HTTP status code
	 */
  get status(): number {
    return this.#code;
  }

	/**
	 * Gets the Tempo instance representing when the operation can be retried.
	 *
	 * @returns Tempo instance for retry time, or undefined if not applicable
	 */
  get retryAt(): Tempo | undefined {
    return this.#retryAt;
  }
}
