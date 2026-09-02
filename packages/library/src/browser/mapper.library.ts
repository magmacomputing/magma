import { asObject } from '#library/object.library.js';
import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish } from '#library/assertion.library.js';
import { instant } from '#library/temporal.library.js';
import { getHemisphere } from '#library/international.library.js';
import type { DebugLevel } from '#library/logger.class.js';

import { Logger } from '#library/logger.class.js';
import type { WebStore } from '#browser/webstore.class.js';

// Various functions to allow geolocating a user-device via the browser.

interface MapOpts {
	catch?: boolean;																					// intercept Promise reject() as resolve() (default: true)
	debug?: DebugLevel;																				// console.log some checkpoints
}

/**
 * To avoid calling google.maps (for UI response-time and cost) we stash the current location.  
 * On subsequent attempts, we check whether the device has moved much before deciding to call google.maps again
 */
interface MapStore {																				// a localStorage object
	geolocation: GeolocationPosition & { error?: GeolocationPositionError["message"] | 'NOT_SUPPORTED' };
	georesponse: google.maps.GeocoderResponse & { error?: Error["message"] };
}

const defaults = { catch: true, debug: 0 } as MapOpts;			// default Options
const context = getContext();																// browser / nodejs / google-apps
const mapStore = {} as MapStore;														// static object to hold last position
const MAP_KEY = '_map_';																		// localStorage key
const log = new Logger('[Mapper]');

let storePromise: Promise<void | WebStore> | null = null;
const getStore = () => {
	if (!storePromise) {
		storePromise = new Promise<void | WebStore>((resolve, reject) => {
			if (context.type === CONTEXT.Browser) {
				import('#browser/webstore.class.js')
					.then(({ WebStore }) => {
						const local = new WebStore('local');
						Object.assign(mapStore, local.get(MAP_KEY, {}));		// fetch the previous MAP_KEY coordinates
						resolve(local);																			// localStorage wrapper
					})
					.catch(reject);
			} else {
				resolve(undefined);																	// no access to localStorage
			}
		});
	}
	return storePromise;
}

/**
 * Attempt geolocation via navigator.getCurrentPosition().
 * 
 * @param opts - Options for the geolocation attempt
 * @returns A promise resolving to the device's coordinates
 * @example
 * ```ts
 * const pos = await geoLocation();
 * ```
 */
export const geoLocation = (opts = {} as MapOpts) =>
	new Promise<MapStore["geolocation"]>((resolve, reject) => {
		opts = Object.assign({}, defaults, opts);
		const fulfil = opts.catch ? resolve : reject;

		if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
			navigator['geolocation'].getCurrentPosition(
				(value) => {																				// on success
					const coords = mapStore.geolocation?.coords;
					const prevLat = coords?.latitude?.toFixed(3);
					const prevLng = coords?.longitude?.toFixed(3);
					const prevTime = mapStore.geolocation?.timestamp ?? 0;

					const test1 = value.coords.latitude.toFixed(3) !== prevLat;
					const test2 = value.coords.longitude.toFixed(3) !== prevLng;
					const test3 = prevTime < (instant().epochMilliseconds - 3_600_000);	// 1 hour ago

					if (test1 || test2 || test3) {										// position has moved, or timeout
						Object.assign(mapStore, { georesponse: null });	// so remove stashed georesponse result
						log.info(opts, 'GeoLocation: device update');
					}

					Object.assign(mapStore, { geolocation: asObject(value) });
					resolve(mapStore.geolocation);
				},
				(error) => {																				// on failure
					Object.assign(mapStore, { geolocation: { error: error.message }, georesponse: null });
					fulfil(mapStore.geolocation);
				})
		} else {																								// not available
			Object.assign(mapStore, { geolocation: { error: 'Not Supported' }, georesponse: null });
			fulfil(mapStore.geolocation);
		}
	})
		.finally(() => {
			const fn = mapStore.geolocation?.error ? log.error : log.info
			fn(opts, 'geoLocation: ', mapStore.geolocation);

			getStore().then((store) => store?.set(MAP_KEY, mapStore));		// stash currentPosition to localStorage
		})

/** 
 * Format coordinates as a GeocoderRequest["location"] object.
 * 
 * @param coords - Optional coordinates to format; defaults to current location
 * @returns A promise resolving to a GeocoderRequest
 * @example
 * ```ts
 * const req = await geoCoords();
 * ```
 */
export const geoCoords = (coords?: google.maps.GeocoderRequest) =>
	new Promise<google.maps.GeocoderRequest | null>((resolve, reject) => {
		if (!isNullish(coords))
			return resolve(coords);															// user-supplied coordinates

		geoLocation()																					// get current location
			.then(geo => isNullish(geo.error)										// successful geolocation
				? ({ location: { lat: geo.coords.latitude, lng: geo.coords.longitude } })
				: null																							// unsuccessful geolocation
			)
			.then(loc => resolve(loc))
			.catch(err => reject(err))
	})

// the following functions need the Map API enabled on the web-site's index page
// https://developers.google.com/maps/documentation/javascript/load-maps-js-api
/** 
 * Make a 'maps' request to the Google Geocoding API.
 * 
 * @param coords - Coordinates to query
 * @param opts - Request options
 * @returns A promise resolving to the geocoder response
 * @example
 * ```ts
 * const res = await mapQuery({ location: { lat: 0, lng: 0 } });
 * ```
 */
export const mapQuery = (coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	new Promise<MapStore["georesponse"]>((resolve, reject) => {
		opts = Object.assign({}, defaults, opts);
		const fulfil = opts.catch ? resolve : reject;

		geoCoords(coords)																			// get a Location object
			.then((loc) => {
				switch (true) {
					case (!(typeof window !== 'undefined' && 'google' in window && 'maps' in window['google'])):
						throw new Error('Google Maps API not configured');

					case isNullish(loc):															// unsuccessful geoLocation
						throw new Error('Cannot determine Coordinates');

					case isNullish(coords): {												 // current location
						const test1 = mapStore.geolocation && mapStore.georesponse;
						const test2 = isNullish(mapStore.geolocation?.error) && isNullish(mapStore.georesponse?.error);

						if (test1 && test2) {													 // if we already have geocoder
							if (opts.debug)
								log.debug(opts, 'mapQuery: cache');
							return resolve(mapStore.georesponse!);				// return previous geocoder
						}
					}																									// drop through to default:

					default:
						new window['google']['maps'].Geocoder().geocode(loc!)
							.then(res => resolve(mapStore.georesponse = asObject(res)))	// successful maps.geocode
				}
			})
			.catch((error) => {																		// unsuccessful geoCoords() | geocode()
				Object.assign(mapStore, { georesponse: { error: error.message } });
				fulfil(mapStore.georesponse);
			})
	})
		.finally(() => {
			if (opts.debug) {
				const fn = mapStore.georesponse?.error ? log.error : log.debug;
				fn(opts, 'mapQuery: ', mapStore.georesponse);
			}

			getStore().then((store) => store?.set(MAP_KEY, mapStore));// stash current georesponse to localStorage
		})

/**
 * Get Hemisphere ('north' | 'south' | null) for supplied coordinates
 * or current geolocation if none supplied.
 * 
 * @param coords - Optional coordinates
 * @param opts - Request options
 * @returns A promise resolving to the hemisphere string
 * @example
 * ```ts
 * const sphere = await mapHemisphere();
 * ```
 */
export const mapHemisphere = (coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	mapQuery(coords, opts)																		// ask Google
		.then((response) => {
			opts = Object.assign({}, defaults, opts);

			if (isNullish(response.error)) {											// useable GeocoderResult detected
				if (opts.debug)
					log.debug(opts, 'sphere: ', response);
				return response.results[0].geometry.location.lat() >= 0 ? 'north' : 'south';
			}

			const sphere = getHemisphere();											// use the timezone offset to determine hemisphere

			if (isNullish(sphere) && opts.catch === false)
				throw new Error('Cannot determine Hemisphere');

			return sphere;
		})
		.catch((error) => {																		 // cannot query coordinates
			if (opts.debug)
				log.warn(opts, 'mapHemisphere: ', error.message);
			if (opts.catch === false)
				throw error;
			return null;
		})

/**
 * Query google-maps for a best-guess address at supplied {lat,lng} coordinates.
 * 
 * @param coords - Optional coordinates; defaults to current location
 * @param opts - Request options
 * @returns A promise resolving to the best-guess address object
 * @example
 * ```ts
 * const address = await mapAddress();
 * ```
 */
export const mapAddress = (coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	mapQuery(coords, opts)
		.then((response) => {
			if (!isNullish(response.error)) throw new Error(response.error);
			return response.results[0];													// first result is 'best-guess'
		})
		.then(({ formatted_address, address_components }) => address_components
			.reduce((acc: Record<string, string | string[]>, itm: any) => {
				itm.types
					.filter((type: string) => type !== 'political')	// ignore not useful type
					.forEach((type: string) => acc[type] = (acc[type] ? (acc[type] + ',') : '').concat(itm.short_name));
				return acc;
			}, { formatted_address } as Record<string, string | string[]>))	// start with formatted_address
		.catch((error) => {
			opts = Object.assign({}, defaults, opts);

			if (opts.debug)
				log.warn(opts, 'mapAddress: ', error.message);
			if (opts.catch === false)
				throw error;
			return null;
		})