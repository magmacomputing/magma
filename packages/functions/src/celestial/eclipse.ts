import {
	SolarOptions,
	resolveCoordinates,
	getMoonPosition,
	getLunarDistanceMetrics,
	getSunCoordinates,
	getLocalSiderealTime,
	getSunHourAngle,
	normalizeHourAngle,
	calculateAltitudeRad,
	getLunarAgeDays,
	getLunarHorizonThreshold,
	toEpochMs,
} from './support.js';

export type EclipseType =
	| 'total-solar'
	| 'annular-solar'
	| 'partial-solar'
	| 'total-lunar'
	| 'partial-lunar'
	| 'penumbral-lunar';

export interface EclipseResult {
	/** Active eclipse classification for the observer, or null if no eclipse is active */
	type: EclipseType | null;
	/** Fraction of the solar or lunar disk obscured for the observer (0.0 to 1.0) */
	obscuration: number;
	/** True if the eclipse is above the observer's horizon and visible */
	isVisible: boolean;
	/** Angular separation between bodies (or shadow center) in arcminutes */
	separationArcmin: number;
}

/**
 * Calculates local solar or lunar eclipse visibility, classification, and disk obscuration fraction for an observer.
 *
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Eclipse classification, obscuration fraction (0.0..1.0), horizon visibility, and angular separation
 */
export function getEclipse(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): EclipseResult {
	const epochMs = toEpochMs(dateInput);
	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const rad = Math.PI / 180;
	const latRad = lat * rad;

	const { ra, dec, hp } = getMoonPosition(epochMs);
	const { raSun, decSun } = getSunCoordinates(epochMs);
	const lstRad = getLocalSiderealTime(epochMs, lng);

	// Solar topocentric altitude
	const haSun = getSunHourAngle(epochMs, lng, raSun);
	const altSunRad = calculateAltitudeRad(latRad, decSun, haSun);
	const altSunDeg = altSunRad / rad;
	const isSunAboveHorizon = altSunDeg >= -0.833;

	// Lunar topocentric coordinates via 3D equatorial parallax
	const hpRad = hp * rad;
	const ux = Math.cos(dec) * Math.cos(ra) - Math.sin(hpRad) * Math.cos(latRad) * Math.cos(lstRad);
	const uy = Math.cos(dec) * Math.sin(ra) - Math.sin(hpRad) * Math.cos(latRad) * Math.sin(lstRad);
	const uz = Math.sin(dec) - Math.sin(hpRad) * Math.sin(latRad);
	const uNorm = Math.sqrt(ux * ux + uy * uy + uz * uz);

	const raMoonTopo = Math.atan2(uy, ux);
	const decMoonTopo = Math.asin(Math.max(-1, Math.min(1, uz / uNorm)));

	const haMoonTopo = normalizeHourAngle(lstRad - raMoonTopo);
	const altMoonRad = calculateAltitudeRad(latRad, decMoonTopo, haMoonTopo);
	const altMoonDeg = altMoonRad / rad;
	const haMoonGeo = normalizeHourAngle(lstRad - ra);
	const altMoonGeoRad = calculateAltitudeRad(latRad, dec, haMoonGeo);
	const isMoonAboveHorizon = (altMoonGeoRad / rad) >= getLunarHorizonThreshold(hp);

	const { distanceKm: _distKm, angularDiameterArcmin } = getLunarDistanceMetrics(hp);
	const rMoonDeg = (angularDiameterArcmin / 2) / 60;
	const rSunDeg = 0.2665; // Nominal solar angular radius in degrees (~16.0 arcmin)

	const ageDays = getLunarAgeDays(epochMs);

	// Check Solar Eclipse near New Moon (ageDays near 0 or 29.53)
	if (ageDays <= 2.5 || ageDays >= 27.0) {
		const cosSep = Math.sin(decSun) * Math.sin(decMoonTopo)
			+ Math.cos(decSun) * Math.cos(decMoonTopo) * Math.cos(raSun - raMoonTopo);
		const sepDeg = Math.acos(Math.max(-1, Math.min(1, cosSep))) / rad;
		const sepArcmin = Math.round(sepDeg * 60 * 10) / 10;

		if (sepDeg < rSunDeg + rMoonDeg) {
			let type: EclipseType = 'partial-solar';
			let obscuration = 0;

			if (sepDeg <= Math.abs(rSunDeg - rMoonDeg)) {
				if (rMoonDeg >= rSunDeg) {
					type = 'total-solar';
					obscuration = 1.0;
				} else {
					type = 'annular-solar';
					obscuration = Math.min(1, (rMoonDeg / rSunDeg) ** 2);
				}
			} else {
				// Circle-circle intersection area
				const R = rSunDeg;
				const r = rMoonDeg;
				const d = sepDeg;
				const part1 = r * r * Math.acos((d * d + r * r - R * R) / (2 * d * r));
				const part2 = R * R * Math.acos((d * d + R * R - r * r) / (2 * d * R));
				const part3 = 0.5 * Math.sqrt(Math.max(0, (-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R)));
				const overlapArea = part1 + part2 - part3;
				obscuration = Math.min(1, Math.max(0, overlapArea / (Math.PI * R * R)));
			}

			return {
				type,
				obscuration: Math.round(obscuration * 1000) / 1000,
				isVisible: isSunAboveHorizon && obscuration > 0,
				separationArcmin: sepArcmin,
			};
		}
	}

	// Check Lunar Eclipse near Full Moon (ageDays near 14.76)
	if (Math.abs(ageDays - 14.765) <= 2.5) {
		const raShadow = (raSun + Math.PI) % (2 * Math.PI);
		const decShadow = -decSun;

		const cosSep = Math.sin(dec) * Math.sin(decShadow)
			+ Math.cos(dec) * Math.cos(decShadow) * Math.cos(ra - raShadow);
		const sepDeg = Math.acos(Math.max(-1, Math.min(1, cosSep))) / rad;
		const sepArcmin = Math.round(sepDeg * 60 * 10) / 10;

		const hpSun = 0.0024;
		const rhoUmbra = 1.02 * (hp + hpSun - rSunDeg);
		const rhoPenumbra = 1.02 * (hp + hpSun + rSunDeg);

		if (sepDeg <= rhoUmbra - rMoonDeg) {
			return {
				type: 'total-lunar',
				obscuration: 1.0,
				isVisible: isMoonAboveHorizon,
				separationArcmin: sepArcmin,
			};
		} else if (sepDeg <= rhoUmbra + rMoonDeg) {
			const obscuration = Math.min(1, Math.max(0, (rhoUmbra + rMoonDeg - sepDeg) / (2 * rMoonDeg)));
			return {
				type: 'partial-lunar',
				obscuration: Math.round(obscuration * 1000) / 1000,
				isVisible: isMoonAboveHorizon && obscuration > 0,
				separationArcmin: sepArcmin,
			};
		} else if (sepDeg <= rhoPenumbra + rMoonDeg) {
			const obscuration = Math.min(1, Math.max(0, (rhoPenumbra + rMoonDeg - sepDeg) / (2 * rMoonDeg)));
			return {
				type: 'penumbral-lunar',
				obscuration: Math.round(obscuration * 1000) / 1000,
				isVisible: isMoonAboveHorizon && obscuration > 0,
				separationArcmin: sepArcmin,
			};
		}
	}

	return {
		type: null,
		obscuration: 0,
		isVisible: false,
		separationArcmin: 0,
	};
}
