import { decodeJWT } from '#library/utility.library.js';
import { logWarn } from './support.util.js';

/**
 * # Tempo Licensing Engine (Open Core)
 * This is the default no-op implementation for the public repository.
 * For premium builds, this is swapped for the proprietary engine during rollup.
 */

export class Validator {
	constructor(public key: string) {
		logWarn('Tempo Community Edition: License keys are ignored. Premium plugins cannot be validated without the cryptographic engine.');
	}
	async verify() {
		// Decodes but DOES NOT verify the signature. 
		// Cannot safely unlock Premium Plugins without cryptographic proof.
		const claims = decodeJWT(this.key);
		return {
			status: 'invalid' as const,
			scopes: {},
			error: 'Cryptographic engine missing. Premium plugins cannot be validated by the Community Build.',
		}
	}
	async syncRevocation(_jwsUrl: string, _currentJti: string): Promise<{ revoked: boolean, success: boolean }> {
		return { revoked: false, success: false }; // No revocation checking in community edition
	}
}

export function definePremiumPlugin<T>(key: string, plugin: T): T {
	logWarn(`Tempo Community Edition: Premium plugin '${key}' loaded without commercial validation engine.`);
	(plugin as any).install = function () {
		throw new Error(`[${key}] Premium plugin requires a valid commercial license. Status: invalid`);
	}
	return plugin;
}

export function definePremiumTerm<T>(pluginDef: T): T {
	logWarn(`Tempo Community Edition: Premium term '${(pluginDef as any).key}' loaded without commercial validation engine.`);
	const key = (pluginDef as any).key;
	const originalResolve = (pluginDef as any).resolve;
	const originalDefine = (pluginDef as any).define;

	const throwLicense = function () {
		throw new Error(`[${key}] Premium plugin requires a valid commercial license. Status: invalid`);
	}

	if (originalResolve) {
		(pluginDef as any).resolve = function (this: any, term: string) {
			throwLicense();
		}
	}

	if (originalDefine) {
		(pluginDef as any).define = function (this: any, term: string, value: any) {
			throwLicense();
		}
	}

	return pluginDef;
}
