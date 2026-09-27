/**
 * Supported hemisphere zones including the equatorial band.
 */
export type GeoSphere = 'north' | 'south' | 'equator';

/**
 * Supported units for geographic distance calculation.
 */
export type DistanceUnit = 'km' | 'miles' | 'm';

/**
 * Supported units for geographic velocity time denominator.
 */
export type TimeUnit =
	| 'hh' | 'h' | 'hours' | 'hour'
	| 'mi' | 'm' | 'minutes' | 'minute'
	| 'ss' | 's' | 'seconds' | 'second';

/**
 * Configuration options for initial compass bearing calculation.
 */
export interface BearingOptions {
	/** Number of decimal places to round (default: 1) */
	precision?: number;
}

/**
 * Configuration options for geographic velocity calculation.
 */
export interface VelocityOptions {
	/** Distance unit (default: 'km') */
	unit?: DistanceUnit;
	/** Time unit for velocity denominator (default: 'hh' for km/h or mph) */
	timeUnit?: TimeUnit;
	/** Number of decimal places to round (default: 2) */
	precision?: number;
}

/**
 * Configuration options for impossible travel anomaly detection.
 */
export interface ImpossibleTravelOptions {
	/** Maximum physically feasible commercial speed in km/h (default: 900 km/h) */
	maxCommercialSpeedKmH?: number;
	/** Distance unit for threshold (default: 'km') */
	unit?: DistanceUnit;
	/** Custom speed threshold override in the specified unit */
	maxSpeed?: number;
}

/**
 * Bounding box coordinates for spatial inclusion queries.
 */
export interface BoundingBox {
	minLat?: number;
	maxLat?: number;
	minLng?: number;
	maxLng?: number;
	minLatitude?: number;
	maxLatitude?: number;
	minLongitude?: number;
	maxLongitude?: number;
}

/**
 * Supported units for solar offset calculation.
 */
export type SolarOffsetUnit = 'mi' | 'minutes' | 'ss' | 'seconds' | 'hh' | 'hours';

/**
 * Configuration options for natural solar time offset calculation.
 */
export interface SolarOffsetOptions {
	/** Unit of return value (default: 'minutes') */
	unit?: SolarOffsetUnit;
	/** Number of decimal places to round (default: 2) */
	precision?: number;
	/** Whether to compute apparent solar time incorporating Equation of Time (default: false for mean solar time) */
	apparent?: boolean;
	/** Explicit IANA timezone override (defaults to coords.timezone or ambient timezone) */
	timeZone?: string;
	/** Reference date/time for DST offset and Equation of Time calculations (default: Date.now()) */
	date?: Date | number | any;
}

/**
 * Mode for synchronizing locale during geolocation.
 */
export type LocaleSyncMode =
	| boolean
	| 'regional' | 'region'
	| 'native' | 'full'
	| 'none' | 'off'
	| (string & {});

export interface GeoConfig {
	readonly latitude?: number | undefined;
	readonly longitude?: number | undefined;
	readonly elevation?: number | undefined;
	readonly sphere?: GeoSphere | undefined;
	readonly country?: string | undefined;
	readonly city?: string | undefined;
	readonly timezone?: string | undefined;
	readonly [key: string]: any;
}

export interface CoordinateInput {
	geo?: any;
	latitude?: number;
	lat?: number;
	longitude?: number;
	lng?: number;
	lon?: number;
	long?: number;
	config?: Record<string, any>;
	[key: string]: any;
}
