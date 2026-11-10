import { QuarterTerm } from './term.quarter.js';
import { SeasonTerm } from './term.season.js';
import { ZodiacTerm, SunSignTerm, StarSignTerm } from './term.zodiac.js';
import { EasternTerm, LunarSignTerm, EasternZodiacTerm } from './term.eastern.js';
import { TimelineTerm, TimeOfDayTerm } from './term.timeline.js';

export {
	QuarterTerm,
	SeasonTerm,
	ZodiacTerm,
	SunSignTerm,
	StarSignTerm,
	EasternTerm,
	LunarSignTerm,
	EasternZodiacTerm,
	TimelineTerm,
	TimeOfDayTerm,
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
