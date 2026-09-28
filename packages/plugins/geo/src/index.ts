import { Tempo } from '@magmacomputing/tempo';
import { definePlugin, deepFreeze, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	setGeoProvider,
	getGeoProvider,
	reverseGeocode,
	forwardGeocode,
	GEO_PROPERTIES,
	type GeoLookupResult,
	type ResolvedCoordinates,
	type GeoConfig,
	type CoordinateInput,
	type GeoProvider,
} from '@magmacomputing/library/runtime/mapper.library.js';
import {
	resolveCulturalLocale,
	type LocaleSyncMode,
} from '@magmacomputing/tempo-fns';
import {
	serverGeoLocation,
	serverGeoCoords,
	serverMapHemisphere,
	type ServerMapOpts,
	type ServerGeolocationResult,
} from '@magmacomputing/library/server/mapper.library.js';
import {
	geoLocation,
} from '@magmacomputing/library/browser/mapper.library.js';
import { isString, isNumber, isObject, isEmpty, isSafeKey } from '@magmacomputing/library/primitives/assertion.library.js';
import type { MutableObject } from '@magmacomputing/library/primitives/type.library.js';

/**
 * Control and execution options filtered out when preserving caller-defined custom metadata.
 */
export const NON_GEO_CONTROL_KEYS = [
	'setTimezone',
	'setLocale',
	'refresh',
	'ttl',
	'endpoint',
	'timeout',
	'maxBytes',
	'highAccuracy',
	'catch',
	'debug',
	'geo',
	'provider',
	'fallback',
	'reverse',
	'autoReverse',
] as const;

export {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	setGeoProvider,
	getGeoProvider,
	reverseGeocode,
	forwardGeocode,
	resolveCulturalLocale,
	serverGeoLocation,
	serverGeoCoords,
	serverMapHemisphere,
	geoLocation,
	GEO_PROPERTIES,
};

export type {
	GeoLookupResult,
	ResolvedCoordinates,
	GeoConfig,
	CoordinateInput,
	GeoProvider,
	LocaleSyncMode,
	ServerMapOpts,
	ServerGeolocationResult,
};

/**
 * Cohesive static namespace for geolocation operations on Tempo.
 */
export interface TempoGeoNamespace {
	/** Asynchronous universal geolocation lookup (browser hardware, server IP, or custom provider) with 24h caching */
	readonly lookup: typeof geoLookup;
	/** Asynchronously resolves coordinates from an instance, config, or ambient storage */
	readonly resolve: typeof resolveGeoCoordinates;
	/** Coerces coordinates and configurations into a canonical GeoConfig object */
	readonly coerce: typeof coerceGeo;
	/** Explicitly stashes coordinates into storage with optional TTL (default 24h) and multi-tenant partitioning */
	readonly stash: typeof stashGeo;
	/** Clears stashed coordinates from storage */
	readonly clear: typeof clearStashedGeo;
	/** Retrieves stashed coordinates from storage */
	readonly get: typeof getStashedGeo;
	/** Sets the active custom geolocation provider gateway */
	readonly setProvider: typeof setGeoProvider;
	/** Gets the currently registered custom geolocation provider */
	readonly getProvider: typeof getGeoProvider;
	/** Reverse geocodes coordinates to address or location metadata using the active provider */
	readonly reverse: typeof reverseGeocode;
	/** Forward geocodes an address or place query string into coordinates using the active provider */
	readonly forward: typeof forwardGeocode;
	/** Low-level server-side IP geolocation handler */
	readonly server: typeof serverGeoLocation;
	/** Low-level browser geolocation API handler */
	readonly browser: typeof geoLocation;
	/** Current ambient or global coordinates snapshot (reads getStashedGeo() ?? Tempo.config.geo) */
	readonly current: GeoConfig | undefined;
}

/**
 * Options for configuring the Geo plugin.
 */
export type GeoPluginOptions = Partial<GeoConfig> & {
	timeout?: number;
	highAccuracy?: boolean;
	provider?: GeoProvider;
	[key: string]: any;
};

/**
 * GeoPlugin installs geolocation lookup and coordinate resolution helpers onto Tempo under the `Tempo.geo` namespace.
 */
export const GeoPlugin: TempoPlugin<GeoPluginOptions> = definePlugin({
	name: 'geo',
	install(this: any, TempoClass: any, options?: GeoPluginOptions) {
		const installedClass = TempoClass || this;
		if (options?.provider)
			setGeoProvider(options.provider);

		const getEffectiveOptions = (callSiteOpts?: Record<string, any>, instance?: any) => {
			const classOpts = installedClass.config?.pluginOptions?.geo;
			const instanceOpts = instance?.config?.pluginOptions?.geo;
			return {
				...(isObject(options) ? options : {}),
				...(isObject(classOpts) ? classOpts : {}),
				...(isObject(instanceOpts) ? instanceOpts : {}),
				...(isObject(callSiteOpts) ? callSiteOpts : {}),
			}
		}

		if (!Object.hasOwn(installedClass, 'geo')) {
			const geoNamespace: TempoGeoNamespace = {
				lookup: (opts?: Record<string, any>) => geoLookup(getEffectiveOptions(opts)),
				resolve: (target?: any, opts?: Record<string, any>) => resolveGeoCoordinates(target, getEffectiveOptions(opts, target)),
				coerce: coerceGeo,
				stash: stashGeo,
				clear: clearStashedGeo,
				get: getStashedGeo,
				setProvider: setGeoProvider,
				getProvider: getGeoProvider,
				reverse: (coords: CoordinateInput, opts?: Record<string, any>) => reverseGeocode(coords, getEffectiveOptions(opts)),
				forward: (query: string, opts?: Record<string, any>) => forwardGeocode(query, getEffectiveOptions(opts)),
				server: serverGeoLocation,
				browser: geoLocation,
				get current(): GeoConfig | undefined {
					return getStashedGeo() ?? installedClass.config?.geo;
				},
			}

			Object.defineProperty(installedClass, 'geo', {
				value: deepFreeze(geoNamespace),
				writable: false,
				configurable: false,
				enumerable: false,
			});
		}

		/**
		 * Asynchronously resolves coordinates for the current instance (or uses existing coordinates),
		 * returning a new Tempo instance with full context synchronization.
		 * 
		 * - setTimezone defaults to true: automatically shifts instance wall-clock time to the resolved location.
		 * - setLocale defaults to true: automatically synchronizes regional BCP 47 locale to geolocated country.
		 * - Option B (Physical Reality): Fresh location metadata updates geographic fields (lat, lng, country, city, sphere, timezone).
		 * - Custom non-geographic metadata (e.g. { venue: 'HQ', officeId: 42 }) is preserved.
		 * - Option C (Call-Site Overrides): Explicit parameters passed to .geoLocate(opts) take absolute precedence.
		 */
		TempoClass.prototype.geoLocate = async function (this: Tempo, opts?: Record<string, any>): Promise<Tempo> {
			const effectiveOpts = getEffectiveOptions(opts, this);
			const setTimezone = effectiveOpts?.setTimezone !== false;
			const setLocale = effectiveOpts?.setLocale ?? true;
			const coords = await resolveGeoCoordinates(this, effectiveOpts);
			if (coords) {
				const existingGeo = isObject(this.config.geo) ? this.config.geo : {};

				// 1. Separate custom non-geo keys from existingGeo to preserve them (Option B)
				const customKeys: Record<string, any> = {};
				for (const key of Object.keys(existingGeo)) {
					if (isSafeKey(key) && !GEO_PROPERTIES.includes(key as any))
						customKeys[key] = (existingGeo as any)[key];
				}

				// 2. Extract call-site overrides (Option C)
				const callSiteGeo = coerceGeo(opts) ?? {};
				if (isObject(opts)) {
					for (const key of Object.keys(opts as object)) {
						if (isSafeKey(key) && !NON_GEO_CONTROL_KEYS.includes(key as any)) {
							if (!GEO_PROPERTIES.includes(key as any))
								customKeys[key] = (opts as any)[key];
						}
					}
				}

				// Preserve existing elevation if network query does not provide elevation data
				const preservedElevation = isNumber((coords as any)?.elevation)
					? (coords as any).elevation
					: (isNumber(existingGeo.elevation) ? existingGeo.elevation : undefined);

				// 3. Compose final merged geo object: custom keys + physical reality (Option B) + call-site overrides (Option C)
				const mergedGeo: MutableObject<GeoConfig> = {
					...customKeys,
					...coords,
					...(isNumber(preservedElevation) ? { elevation: preservedElevation } : {}),
					...callSiteGeo,
				};

				// Clean up coordinates and infer sphere
				const lat = mergedGeo.latitude;
				const lng = mergedGeo.longitude;
				if (isNumber(lat)) mergedGeo.latitude = Math.round(lat * 1000) / 1000;
				if (isNumber(lng)) mergedGeo.longitude = Math.round(lng * 1000) / 1000;
				if (!mergedGeo.sphere && isNumber(lat))
					mergedGeo.sphere = lat > 0.001 ? 'north' : (lat < -0.001 ? 'south' : 'equator');

				let instance: Tempo = this;
				const targetTz = mergedGeo.timezone;
				if (setTimezone && isString(targetTz) && !isEmpty(targetTz))
					instance = this.set({ timeZone: targetTz });

				const targetLocale = (mergedGeo.country || isString(setLocale))
					? resolveCulturalLocale((this as any).locale ?? this.config.locale, mergedGeo.country, setLocale)
					: undefined;

				return new TempoClass(instance, {
					...instance.config,
					...(targetLocale ? { locale: targetLocale } : {}),
					geo: deepFreeze(mergedGeo),
					...(mergedGeo.sphere ? { sphere: mergedGeo.sphere } : {}),
				});
			}
			return this;
		};

		/**
		 * Resolves coordinates for this instance via explicit coordinates or automatic IP/hardware lookup.
		 */
		TempoClass.prototype.geoLookup = async function (this: Tempo, opts?: Record<string, any>): Promise<ResolvedCoordinates | null> {
			return resolveGeoCoordinates(this, getEffectiveOptions(opts, this));
		};
	},
});

export const geoPlugin = GeoPlugin;
export default GeoPlugin;

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/**
		 * Asynchronously resolves coordinates for this instance and returns a new Tempo instance with geo set.
		 */
		geoLocate(opts?: Record<string, any>): Promise<Tempo>;
		/**
		 * Resolves coordinates for this instance via explicit coordinates or automatic IP/hardware lookup.
		 */
		geoLookup(opts?: Record<string, any>): Promise<ResolvedCoordinates | null>;
	}

	namespace Tempo {
		let geo: TempoGeoNamespace;
	}
}
