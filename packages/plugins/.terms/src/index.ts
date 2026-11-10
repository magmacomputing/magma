import { QuarterTerm, QUARTER_KEYS, type QuarterKey } from './term.quarter.js';
import { SeasonTerm, SEASON_KEYS, type SeasonKey } from './term.season.js';
import { ZodiacTerm, SunSignTerm, StarSignTerm, ZODIAC_KEYS, type WesternZodiacKey, type WesternZodiacScope } from './term.zodiac.js';
import { EasternTerm, LunarSignTerm, EasternZodiacTerm, EASTERN_ANIMAL_KEYS, type EasternAnimalKey, type EasternZodiacScope, type LunarZodiacVariants, type RegionalVariant } from './term.eastern.js';
import { TimelineTerm, TimeOfDayTerm, TIMEOFDAY_KEYS, type TimeOfDayKey } from './term.timeline.js';

export {
	QuarterTerm,
	QUARTER_KEYS,
	type QuarterKey,
	SeasonTerm,
	SEASON_KEYS,
	type SeasonKey,
	ZodiacTerm,
	SunSignTerm,
	StarSignTerm,
	ZODIAC_KEYS,
	type WesternZodiacKey,
	type WesternZodiacScope,
	EasternTerm,
	LunarSignTerm,
	EasternZodiacTerm,
	EASTERN_ANIMAL_KEYS,
	type EasternAnimalKey,
	type EasternZodiacScope,
	type LunarZodiacVariants,
	type RegionalVariant,
	TimelineTerm,
	TimeOfDayTerm,
	TIMEOFDAY_KEYS,
	type TimeOfDayKey,
};

/**
 * Universal civic and calendar terms registered by default in Core Tempo.
 */
export const CivicTerms = [
	QuarterTerm,
	SeasonTerm,
	TimelineTerm,
];

/**
 * Cultural and astrological terms available opt-in via the `./terms` subpath.
 */
export const CulturalTerms = [
	ZodiacTerm,
	EasternTerm,
];

/**
 * Combined array of all built-in Civic and Cultural terms.
 */
export const StandardTerms = [
	QuarterTerm,
	SeasonTerm,
	TimelineTerm,
	ZodiacTerm,
	EasternTerm,
];
