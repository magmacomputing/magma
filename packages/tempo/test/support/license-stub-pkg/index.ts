/**
 * # Tempo Licensing Stub
 * This is used in CI environments where the full licensing engine is not available.
 */

export class Validator {
	constructor(public key: string) { }
	async verify(): Promise<any> {
		return {
			status: 'active', // Default to active in CI to allow tests to run
			scopes: { astro: {}, weather: {}, premium: {} },
			error: null
		};
	}
}
