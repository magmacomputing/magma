import { Pledge } from '#library/pledge.class.js';
import { decodeJWT } from '#library/webtoken.library.js';
import { secure } from '#library/proxy.library.js';
import { asError } from '#library/coercion.library.js';
import { isObject, isNumber, isFunction } from '#library/assertion.library.js';

import { isSyncToken } from '../../support/support.util.js';
import { logWarn, logDebug } from '../../support/support.util.js';
import { LICENSE } from '../../support/support.enum.js';
import { getRuntime } from '../../support/support.runtime.js';

import type { Internal } from '../../tempo.type.js';

let stateLicenseCache: WeakMap<Internal.State, Internal.LicenseState> = new WeakMap();
const logMessage = 'Tempo Licensing:';

export function getLicenseState(state: Internal.State): Internal.LicenseState {
	const runtime = getRuntime();
	if (state === runtime.state)
		return runtime.license;

	return stateLicenseCache.get(state) ?? ensureLicenseState(state);
}

export function ensureLicenseState(state: Internal.State): Internal.LicenseState {
	let license = stateLicenseCache.get(state);

	if (!license) {
		license = { status: LICENSE.None, scopes: {} } as Internal.LicenseState;
		stateLicenseCache.set(state, license);

		if (state !== getRuntime().state)
			(state as any).license = license;
	}

	return license;
}

export function getLicenseSnapshot(state: Internal.State): Internal.LicenseState {
	const license = getLicenseState(state);
	const snapshot: Internal.LicenseState = {
		...license,
		scopes: isObject(license.scopes) ? { ...license.scopes } : {},
	}

	delete (snapshot as any).jws;
	return secure(snapshot);
}

function disposePendingLicense(license?: Internal.LicenseState): void {
	const jws = license?.jws as any;
	if (jws && jws.isPending) {
		if (jws.promise && isFunction(jws.promise.catch))
			jws.promise.catch(() => { });
		// Do not explicitly reject stale license promises during teardown.
		// The stale pledge already has onReject/onResolve handlers and state
		// guards that will ignore later results based on JTI/key mismatch.
	}
}

export function setLicense(state: Internal.State, key: string): void {
	const runtime = getRuntime();
	const license = (state === runtime.state ? runtime.license : ensureLicenseState(state));
	if (key) {
		disposePendingLicense(license);
		const claims = decodeJWT(key);
		license.key = key;
		license.status = LICENSE.Pending;
		license.scopes = claims?.scopes || {};

		if (claims?.exp) license.expires = claims.exp;
		if (claims?.iat) license.issuedAt = claims.iat;
		if (claims?.iss) license.issuer = claims.iss;
		if (claims?.sub) license.subject = claims.sub;
		if (claims?.aud) license.audience = claims.aud;
		if (claims?.jti) license.jti = claims.jti;
		delete (license as any).error;

		const initialJti = license.jti;
		const initialKey = license.key;
		const argObj = {
			tag: 'license',
			onResolve: (res: any) => {
				if (license.jti !== initialJti || license.key !== initialKey) return;

				const isValidStatus = isSyncToken(res.status) || LICENSE.values().includes(res.status);
				license.status = isValidStatus ? res.status : LICENSE.Invalid;
				license.scopes = isObject(res.scopes) ? res.scopes : {};
				delete (license as any).error;
				if (res.error) license.error = res.error;
				if (res.expires) license.expires = res.expires;
				if (res.issuedAt) license.issuedAt = res.issuedAt;
				if (res.issuer) license.issuer = res.issuer;
				if (res.jti) license.jti = res.jti;

				if ([LICENSE.Revoked, LICENSE.Invalid].includes(res.status))
					logWarn(`⚠️ ${logMessage} ${res.error || 'Verification failed'}`, state.config);
				else
					warnIfExpiringSoon(license, state.config);

				if (res.revocationPromise) {
					res.revocationPromise.then((isRevoked: boolean) => {
						if (isRevoked && license.jti === initialJti && license.key === initialKey) {
							license.status = LICENSE.Revoked;
							license.error = 'License has been revoked by the issuer.';
							logWarn(`⚠️ ${logMessage} ${license.error}`, state.config);
						} else {
							warnIfExpiringSoon(license, state.config);
						}
					}).catch((err: unknown) => {
						const { message } = asError(err);
						logDebug(`${logMessage} Background revocation check failed for JTI ${initialJti} - ${message}`, state.config);
					});
				}
			},
			onReject: (err: unknown) => {
				if (license.jti !== initialJti || license.key !== initialKey) return;
				const error = asError(err);
				license.status = LICENSE.Invalid;
				license.error = error.message || 'Verification rejected';
				logWarn(`⚠️ ${logMessage} ${license.error}`, state.config);
			}
		}
		license.jws = new Pledge<Internal.ValidationResult>(argObj as any);
	}
}

export function warnIfExpiringSoon(license: Internal.LicenseState, config: any): void {
	const nowS = Math.floor(Date.now() / 1_000);

	const checkExpiry = (label: string, expS: number | undefined, iatS: number | undefined) => {
		if (!expS) return;
		const remainingS = expS - nowS;
		if (remainingS <= 0) return;

		const windowS = iatS
			? (expS - iatS) * 0.25
			: 30 * 24 * 60 * 60;

		if (remainingS <= windowS) {
			const days = Math.ceil(remainingS / 86_400);
			const plural = days === 1 ? 'day' : 'days';
			logWarn(`⏳ ${logMessage} ${label} expires in ${days} ${plural} — visit https://registry.magmacomputing.com.au to renew.`, config);
		}
	};

	checkExpiry('License key', isNumber(license.expires) ? license.expires : undefined, license.issuedAt);
	for (const [scopeKey, meta] of Object.entries(license.scopes || {})) {
		const m = meta as any;
		if (m?.exp) checkExpiry(`Scope '${scopeKey}'`, m.exp, m.iat ?? license.issuedAt);
	}
}

export function validateLicenseState(license: Internal.LicenseState, jws: Pledge<Internal.ValidationResult>) {
	import('#tempo/license')
		.then(m => new m.Validator(license.key!).verify())
		.then(res => jws.resolve(res))
		.catch(err => {
			if (license.jws === jws)
				license.status = LICENSE.None;
			jws.reject(err);
		});
}
