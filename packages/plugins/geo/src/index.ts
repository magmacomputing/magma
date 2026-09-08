import { Tempo } from '@magmacomputing/tempo';
import { definePlugin, deepFreeze, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	type GeoLookupResult,
	type GeoConfig,
	type CoordinateInput,
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

export {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	serverGeoLocation,
	serverGeoCoords,
	serverMapHemisphere,
	geoLocation,
};

export type {
	GeoLookupResult,
	GeoConfig,
	CoordinateInput,
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
			stash: stashGeo,
			clear: clearStashedGeo,
			get: getStashedGeo,
			server: serverGeoLocation,
			browser: geoLocation,
			get current(): GeoConfig | undefined {
				return getStashedGeo() ?? TempoClass.config?.geo;
			},
		}

		Object.defineProperty(TempoClass, 'geo', {
			value: deepFreeze(geoNamespace),
			writable: false,
			configurable: false,
			enumerable: false,
		});

		/**
		 * Asynchronously resolves coordinates for the current instance (or uses existing coordinates),
		 * returning a new Tempo instance with the resolved `geo` configuration attached.
		 */
		TempoClass.prototype.geoLocate = async function (this: Tempo, opts?: Record<string, any>): Promise<Tempo> {
			const coords = await resolveGeoCoordinates(this, opts);
			if (coords) {
				const existingGeo = (typeof this.config.geo === 'object' && this.config.geo !== null) ? this.config.geo : {};
				return new TempoClass(this, {
					...this.config,
					geo: {
						...existingGeo,
						latitude: coords.lat,
						longitude: coords.lng,
					},
				});
			}
			return this;
		};

		/**
		 * Resolves coordinates for this instance via explicit coordinates or automatic IP/hardware lookup.
		 */
		TempoClass.prototype.geoLookup = async function (this: Tempo, opts?: Record<string, any>): Promise<{ lat: number; lng: number } | null> {
			return resolveGeoCoordinates(this, opts);
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
		geoLookup(opts?: Record<string, any>): Promise<{ lat: number; lng: number } | null>;
	}

	namespace Tempo {
		let geo: TempoGeoNamespace;
	}
}
