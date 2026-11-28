import { QuarterTerm, QUARTER_KEYS, type QuarterKey } from './term.quarter.js';
import { FiscalTerm, FISCAL_KEYS, type FiscalKey, type FiscalTermOptions, FISCAL_COUNTRY_DEFAULTS } from './term.fiscal.js';
import { SeasonTerm, SEASON_KEYS, type SeasonKey } from './term.season.js';
import { TimelineTerm, TimeOfDayTerm, TIMEOFDAY_KEYS, type TimeOfDayKey } from './term.timeline.js';

export {
	QuarterTerm,
	QUARTER_KEYS,
	type QuarterKey,
	FiscalTerm,
	FISCAL_KEYS,
	type FiscalKey,
	type FiscalTermOptions,
	FISCAL_COUNTRY_DEFAULTS,
	SeasonTerm,
	SEASON_KEYS,
	type SeasonKey,
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
 * Combined array of all built-in Civic and Fiscal terms.
 */
export const StandardTerms = [
	...CivicTerms,
	FiscalTerm,
];
