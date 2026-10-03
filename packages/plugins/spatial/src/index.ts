import { Tempo } from '@magmacomputing/tempo';
import { definePlugin, deepFreeze, hasOwn, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import {
	haversineDistance,
	calculateBearing,
	calculateMidpoint,
	calculateVelocity,
	isImpossibleTravel,
	isWithin,
	inBoundingBox,
	solarOffset,
	resolveCulturalLocale,
	type DistanceUnit,
	type TimeUnit,
	type BearingOptions,
	type VelocityOptions,
	type ImpossibleTravelOptions,
	type BoundingBox,
	type SolarOffsetOptions,
	type SolarOffsetUnit,
	type GeoSphere,
	type CoordinateInput,
} from '@magmacomputing/tempo-fns';

export {
	haversineDistance,
	calculateBearing,
	calculateMidpoint,
	calculateVelocity,
	isImpossibleTravel,
	isWithin,
	inBoundingBox,
	solarOffset,
	resolveCulturalLocale,
};

export type {
	DistanceUnit,
	TimeUnit,
	BearingOptions,
	VelocityOptions,
	ImpossibleTravelOptions,
	BoundingBox,
	SolarOffsetOptions,
	SolarOffsetUnit,
	GeoSphere,
	CoordinateInput,
};

/**
 * Cohesive static namespace for GIS geometry, Great-Circle navigation, and spatial queries.
 */
export interface TempoSpatialNamespace {
	/** Calculates the Great-Circle distance between two coordinates using the Haversine formula (km, miles, or m) */
	readonly distance: typeof haversineDistance;
	/** Computes the initial forward azimuth compass bearing in degrees (0° to 360° True North) along the Great-Circle route */
	readonly bearing: typeof calculateBearing;
	/** Computes the Great-Circle geographic midpoint between two coordinates with automatic hemisphere inference */
	readonly midpoint: typeof calculateMidpoint;
	/** Calculates the travel speed between two timestamped instances or coordinate objects (km/h, mph, or m/s) */
	readonly velocity: typeof calculateVelocity;
	/** Evaluates impossible travel anomalies between timestamped events based on commercial aviation velocity thresholds */
	readonly isImpossibleTravel: typeof isImpossibleTravel;
	/** Evaluates whether two coordinates are within a specified distance threshold */
	readonly isWithin: typeof isWithin;
	/** Evaluates whether coordinates fall within a rectangular geographic bounding box */
	readonly inBoundingBox: typeof inBoundingBox;
	/** Calculates natural solar time offset between civil clock time and actual solar noon */
	readonly solarOffset: typeof solarOffset;
}

/**
 * Options for configuring the Spatial plugin.
 */
export type SpatialPluginOptions = Record<string, any>;

/**
 * SpatialPlugin installs GIS geometry, Great-Circle navigation, and spatial queries onto Tempo under the `Tempo.spatial` namespace.
 */
export const SpatialPlugin: TempoPlugin<SpatialPluginOptions> = definePlugin({
	name: 'spatial',
	install(this: any, TempoClass: any) {
		const installedClass = TempoClass || this;

		if (!hasOwn(installedClass, 'spatial')) {
			const spatialNamespace: TempoSpatialNamespace = {
				distance: haversineDistance,
				bearing: calculateBearing,
				midpoint: calculateMidpoint,
				velocity: calculateVelocity,
				isImpossibleTravel,
				isWithin,
				inBoundingBox,
				solarOffset,
			};

			Object.defineProperty(installedClass, 'spatial', {
				value: deepFreeze(spatialNamespace),
				writable: false,
				configurable: false,
				enumerable: false,
			});
		}

		/**
		 * Calculates the Great-Circle distance from this instance's coordinates to target coordinates.
		 */
		TempoClass.prototype.spatialDistance = function (this: Tempo, to: any, unit: DistanceUnit = 'km'): number {
			return haversineDistance(this, to, unit);
		};

		/**
		 * Computes the initial forward compass bearing in degrees (0° to 360°) from this instance to target coordinates.
		 */
		TempoClass.prototype.spatialBearing = function (this: Tempo, to: any, options?: BearingOptions): number {
			return calculateBearing(this, to, options);
		};

		/**
		 * Calculates travel velocity from this instance to target timestamped instance or coordinate object.
		 */
		TempoClass.prototype.spatialVelocity = function (this: Tempo, to: any, options?: VelocityOptions): number {
			return calculateVelocity(this, to, options);
		};

		/**
		 * Calculates natural solar time offset for this instance's coordinates.
		 */
		TempoClass.prototype.spatialSolarOffset = function (this: Tempo, options?: SolarOffsetOptions): number {
			return solarOffset(this, options);
		};

		/**
		 * Evaluates whether this instance is within a specified proximity distance to target coordinates.
		 */
		TempoClass.prototype.isWithin = function (this: Tempo, to: any, maxDistance: number, unit: DistanceUnit = 'km'): boolean {
			return isWithin(this, to, maxDistance, unit);
		};

		/**
		 * Evaluates whether this instance's coordinates fall within a rectangular bounding box.
		 */
		TempoClass.prototype.inBoundingBox = function (this: Tempo, bbox: BoundingBox): boolean {
			return inBoundingBox(this, bbox);
		};
	},
});

export const spatialPlugin = SpatialPlugin;
export default SpatialPlugin;

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/**
		 * Calculates the Great-Circle distance from this instance to target coordinates.
		 */
		spatialDistance(to: any, unit?: DistanceUnit): number;
		/**
		 * Computes the initial forward compass bearing in degrees (0° to 360°) from this instance to target coordinates.
		 */
		spatialBearing(to: any, options?: BearingOptions): number;
		/**
		 * Calculates travel velocity from this instance to target timestamped instance.
		 */
		spatialVelocity(to: any, options?: VelocityOptions): number;
		/**
		 * Calculates natural solar time offset for this instance's coordinates.
		 */
		spatialSolarOffset(options?: SolarOffsetOptions): number;
		/**
		 * Evaluates whether this instance is within a specified proximity distance to target coordinates.
		 */
		isWithin(to: any, maxDistance: number, unit?: DistanceUnit): boolean;
		/**
		 * Evaluates whether this instance's coordinates fall within a rectangular bounding box.
		 */
		inBoundingBox(bbox: BoundingBox): boolean;
	}

	namespace Tempo {
		let spatial: TempoSpatialNamespace;
	}
}
