import { looseIndex } from '#library/object.library.js';

/** check valid Tempo instance */
export const isTempo = (tempo?: any): tempo is TempoBrand => Boolean(tempo?.[sym.$isTempo]);

/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

export const IsTempo: unique symbol = Symbol.for('magmacomputing/tempo/isTempo') as any;
export const TermError: unique symbol = Symbol.for('magmacomputing/tempo/termError') as any;

/** @internal Tempo Symbol Registry */
export const sym = {
	/** key for Global Discovery of Tempo configuration */		$Tempo: Symbol.for('$Tempo'),
	/** key for Reactive Plugin Registration */								$Register: Symbol.for('magmacomputing/tempo/register'),
	/** key for Global Identity Brand for Tempo */						$isTempo: IsTempo,
	/** key for centralized Term Error dispatching */					$termError:TermError,
	/** key for Internal Interpreter Service */								$Interpreter: Symbol.for('magmacomputing/tempo/interpreter'),
	/** key for contextual Error Logging */										$logError: Symbol.for('magmacomputing/tempo/logError'),
	/** key for contextual Debug Logging */										$logDebug: Symbol.for('magmacomputing/tempo/logDebug'),
	/** key for contextual Debugger */												$dbg: Symbol.for('magmacomputing/tempo/dbg'),
	/** key for Master Guard */																$guard: Symbol.for('magmacomputing/tempo/guard'),
	/** internal key for signaling pre-errored state */				$errored: Symbol.for('magmacomputing/tempo/errored'),
	/** internal key for accessing private instance state */	$Internal: Symbol.for('magmacomputing/tempo/internal'),
	/** hardened globalThis bridge key for the TempoRuntime */$Bridge: Symbol.for('magmacomputing/tempo/runtime'),
	/** cross-bundle brand check for TempoRuntime */					$RuntimeBrand: Symbol.for('magmacomputing/tempo/runtime/brand'),
	/** branding for explicit PropertyDescriptors */					$Descriptor: Symbol.for('magmacomputing/tempo/descriptor'),
} as const;

/** @internal Local interface for brand checking without circular imports */
export interface TempoBrand {
	[sym.$isTempo]: true;
	toDateTime(): Temporal.ZonedDateTime;
	config: any;
}

/** @internal Tempo Token registry */
export const Token = looseIndex<string, symbol>()({
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Snippet Symbols
	/** year */																								yy: Symbol('yy'),
	/** ISO yearOfWeek */																			yw: Symbol('yw'),
	/** month */																							mm: Symbol('mm'),
	/** day */																								dd: Symbol('dd'),
	/** hour */																								hh: Symbol('hh'),
	/** minute */																							mi: Symbol('mi'),
	/** second */																							ss: Symbol('ss'),
	/** fraction */																						ff: Symbol('ff'),
	/** meridiem */																						mer: Symbol('mer'),
	/** short weekday name */																	www: Symbol('www'),
	/** relative-suffix */																		afx: Symbol('afx'),
	/** time-suffix */																				sfx: Symbol('sfx'),
	/** time unit */																					unt: Symbol('unt'),
	/** separator */																					sep: Symbol('sep'),
	/** modifier */																						mod: Symbol('mod'),
	/** generic number */																			nbr: Symbol('nbr'),
	/** Tempo slick shorthand */															slk: Symbol('slk'),
	/** Tempo event */																				evt: Symbol('evt'),
	/** Tempo period */																				per: Symbol('per'),
	/** time zone offset */																		tzd: Symbol('tzd'),
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Layout Symbols
	/** date */																								dt: Symbol('date'),
	/** time */																								tm: Symbol('time'),
	/** date and time */																			dtm: Symbol('dateTime'),
	/** day-month-year */																			dmy: Symbol('dayMonthYear'),
	/** month-day-year */																			mdy: Symbol('monthDayYear'),
	/** year-month-day */																			ymd: Symbol('yearMonthDay'),
	/** day of month offset */																off: Symbol('offset'),
	/** weekDay */																						wkd: Symbol('weekDay'),
	/** relative offset (years, days, hours, etc) */					rel: Symbol('relativeOffset'),
	/** timezone/calendar brackets */													brk: Symbol('brackets'),
});
export type Token = typeof Token;
