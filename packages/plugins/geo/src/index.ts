import { Tempo } from '@magmacomputing/tempo';
import { definePlugin, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import {
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	getStashedGeo,
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

type GeoLookupFn = typeof geoLookup;
type ResolveGeoCoordinatesFn = typeof resolveGeoCoordinates;
type ServerGeoLocationFn = typeof serverGeoLocation;
type GeoLocationFn = typeof geoLocation;

/**
 * GeoPlugin installs geolocation lookup and coordinate resolution helpers onto Tempo.
 */
export const GeoPlugin: TempoPlugin = definePlugin({
	name: 'geo',
	install(TempoClass: any) {
		TempoClass.geoLookup = geoLookup;
		TempoClass.resolveGeoCoordinates = resolveGeoCoordinates;
		TempoClass.serverGeoLocation = serverGeoLocation;
		TempoClass.geoLocation = geoLocation;

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
		let geoLookup: GeoLookupFn;
		let resolveGeoCoordinates: ResolveGeoCoordinatesFn;
		let serverGeoLocation: ServerGeoLocationFn;
		let geoLocation: GeoLocationFn;
	}
}
