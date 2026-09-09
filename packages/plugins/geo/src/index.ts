import { Tempo } from '@magmacomputing/tempo';
import { definePlugin, deepFreeze, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	GEO_PROPERTIES,
	haversineDistance,
	solarOffset,
	type GeoLookupResult,
	type ResolvedCoordinates,
	type GeoConfig,
	type CoordinateInput,
	type DistanceUnit,
	type SolarOffsetOptions,
	type SolarOffsetUnit,
} from '@magmacomputing/library/runtime/mapper.library.js';
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
import { isString, isNumber, isEmpty, isSafeKey } from '@magmacomputing/library/primitives/assertion.library.js';

export {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	GEO_PROPERTIES,
	haversineDistance,
	solarOffset,
	serverGeoLocation,
	serverGeoCoords,
	serverMapHemisphere,
	geoLocation,
};

export type {
	GeoLookupResult,
	ResolvedCoordinates,
	GeoConfig,
	CoordinateInput,
	DistanceUnit,
	SolarOffsetOptions,
	SolarOffsetUnit,
	ServerMapOpts,
	ServerGeolocationResult,
};

/**
 * Cohesive static namespace for geolocation operations on Tempo.
 */
export interface TempoGeoNamespace {
	/** Asynchronous universal geolocation lookup (browser hardware or server IP) with 24h caching */
	readonly lookup: typeof geoLookup;
	/** Asynchronously resolves coordinates from an instance, config, or ambient storage */
	readonly resolve: typeof resolveGeoCoordinates;
	/** Coerces coordinates and configurations into a canonical GeoConfig object */
	readonly coerce: typeof coerceGeo;
	/** Calculates Great-Circle distance between two coordinates using Haversine formula */
	readonly distance: typeof haversineDistance;
	/** Calculates Natural Solar Time Offset between civil clock time and actual solar noon */
	readonly solarOffset: typeof solarOffset;
	/** Explicitly stashes coordinates into storage with optional TTL (default 24h) and multi-tenant partitioning */
	readonly stash: typeof stashGeo;
	/** Clears stashed coordinates from storage */
	readonly clear: typeof clearStashedGeo;
	/** Retrieves stashed coordinates from storage */
	readonly get: typeof getStashedGeo;
	/** Low-level server-side IP geolocation handler */
	readonly server: typeof serverGeoLocation;
	/** Low-level browser geolocation API handler */
	readonly browser: typeof geoLocation;
	/** Current ambient or global coordinates snapshot (reads getStashedGeo() ?? Tempo.config.geo) */
	readonly current: GeoConfig | undefined;
}

/**
 * GeoPlugin installs geolocation lookup and coordinate resolution helpers onto Tempo under the `Tempo.geo` namespace.
 */
export const GeoPlugin: TempoPlugin = definePlugin({
	name: 'geo',
	install(TempoClass: any) {
		const geoNamespace: TempoGeoNamespace = {
			lookup: geoLookup,
			resolve: resolveGeoCoordinates,
			coerce: coerceGeo,
			distance: haversineDistance,
			solarOffset,
			stash: stashGeo,
			clear: clearStashedGeo,
			get: getStashedGeo,
			server: serverGeoLocation,
			browser: geoLocation,
			get current(): GeoConfig | undefined {
				return getStashedGeo() ?? TempoClass.config?.geo;
			},
		};

		Object.defineProperty(TempoClass, 'geo', {
			value: deepFreeze(geoNamespace),
			writable: false,
			configurable: false,
			enumerable: false,
		});

		/**
		 * Asynchronously resolves coordinates for the current instance (or uses existing coordinates),
		 * returning a new Tempo instance with full context synchronization.
		 * 
		 * - setTimezone defaults to true: automatically shifts instance wall-clock time to the resolved location.
		 * - Option B (Physical Reality): Fresh location metadata updates geographic fields (lat, lng, country, city, sphere, timezone).
		 * - Custom non-geographic metadata (e.g. { venue: 'HQ', officeId: 42 }) is preserved.
		 * - Option C (Call-Site Overrides): Explicit parameters passed to .geoLocate(opts) take absolute precedence.
		 */
		TempoClass.prototype.geoLocate = async function (this: Tempo, opts?: Record<string, any>): Promise<Tempo> {
			const setTimezone = opts?.setTimezone !== false;
			const coords = await resolveGeoCoordinates(this, opts);
			if (coords) {
				const existingGeo = (typeof this.config.geo === 'object' && this.config.geo !== null) ? this.config.geo : {};

				// 1. Separate custom non-geo keys from existingGeo to preserve them (Option B)
				const customKeys: Record<string, any> = {};
				for (const key of Object.keys(existingGeo)) {
					if (isSafeKey(key) && !GEO_PROPERTIES.includes(key as any))
						customKeys[key] = (existingGeo as any)[key];
				}

				// 2. Extract call-site overrides (Option C)
				const callSiteGeo = coerceGeo(opts) ?? {};
				if (opts && typeof opts === 'object') {
					for (const key of Object.keys(opts)) {
						if (isSafeKey(key) && !['setTimezone', 'refresh', 'ttl', 'endpoint', 'timeout', 'catch', 'debug', 'geo'].includes(key)) {
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
				const mergedGeo: GeoConfig = {
					...customKeys,
					...coords,
					...(isNumber(preservedElevation) ? { elevation: preservedElevation } : {}),
					...callSiteGeo,
				};

				// Clean up coordinates and infer sphere
				if (isNumber(mergedGeo.latitude)) mergedGeo.latitude = Math.round(mergedGeo.latitude * 1000) / 1000;
				if (isNumber(mergedGeo.longitude)) mergedGeo.longitude = Math.round(mergedGeo.longitude * 1000) / 1000;
				if (!mergedGeo.sphere && isNumber(mergedGeo.latitude)) {
					mergedGeo.sphere = mergedGeo.latitude > 0.001 ? 'north' : (mergedGeo.latitude < -0.001 ? 'south' : 'equator');
				}

				let instance: Tempo = this;
				const targetTz = mergedGeo.timezone;
				if (setTimezone && isString(targetTz) && !isEmpty(targetTz))
					instance = this.set({ timeZone: targetTz });

				return new TempoClass(instance, {
					...instance.config,
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
			return resolveGeoCoordinates(this, opts);
		};

		/**
		 * Calculates Great-Circle distance from this instance's coordinates to target coordinates using Haversine formula.
		 */
		TempoClass.prototype.geoDistance = function (this: Tempo, other: any, unit?: DistanceUnit): number {
			return haversineDistance(this, other, unit);
		};

		/**
		 * Calculates Natural Solar Time Offset between civil clock time and actual solar noon for this instance.
		 */
		TempoClass.prototype.geoSolarOffset = function (this: Tempo, options?: SolarOffsetOptions): number {
			return solarOffset(this, options);
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
		/**
		 * Calculates Great-Circle distance from this instance's coordinates to target coordinates using Haversine formula.
		 */
		geoDistance(other: any, unit?: DistanceUnit): number;
		/**
		 * Calculates Natural Solar Time Offset between civil clock time and actual solar noon for this instance.
		 */
		geoSolarOffset(options?: SolarOffsetOptions): number;
	}

	namespace Tempo {
		let geo: TempoGeoNamespace;
	}
}
