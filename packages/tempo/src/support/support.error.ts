/**
 * Custom Error class for fatal Tempo exceptions.
 */
export class TempoError extends Error {
	constructor(message: string) {
		super(`[Tempo] ${message}`);
		this.name = 'TempoError';
		Object.setPrototypeOf(this, TempoError.prototype);
	}
}
