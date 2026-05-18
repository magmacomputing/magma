/**
 * # Tempo Licensing Engine (Open Core)
 * This is the default no-op implementation for the public repository.
 * For premium builds, this is swapped for the proprietary engine during rollup.
 */
type CommunityLicenseVerification = {
	status: 'active';
	scopes: { community: true };
	error: null;
}

export class Validator {
	constructor(public key: string) { }
	async verify(): Promise<CommunityLicenseVerification> {
		return {
			status: 'active', // Default to active for community use
			scopes: { community: true },
			error: null
		};
	}
}
