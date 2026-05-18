/**
 * # Tempo Licensing Engine (Open Core)
 * This is the default no-op implementation for the public repository.
 * For premium builds, this is swapped for the proprietary engine during rollup.
 */

export class Validator {
	constructor(public key: string) { }
	async verify() {
		return {
			status: 'active' as const,
			scopes: {} as Record<string, { exp?: number; updated_at?: number }>,
		}
	}
	async syncRevocation(_jwsUrl: string, _currentJti: string): Promise<boolean> {
		return false; // No revocation checking in community edition
	}
}
