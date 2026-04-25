import { looseIndex } from '#library/object.library.js';
import { sym as lib, $Target, $Discover, $Extensible, $Inspect, $Logify, $Registry, $Register as $LibRegister, $SerializerRegistry, $Identity } from '#library/symbol.library.js';
export { $Target, $Discover, $Extensible, $Inspect, $Logify, $Registry, $LibRegister, $SerializerRegistry, $Identity };

/** check valid Tempo instance */
export const isTempo = (tempo?: any): tempo is TempoBrand => Boolean(tempo?.[sym.$Identity]);

/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

export const TermError: unique symbol = Symbol.for('magmacomputing/tempo/termError') as any;

/** @internal unique symbols for critical internal accessors */
/** key for Global Discovery of Tempo configuration */		export const $Tempo: unique symbol = Symbol.for('$Tempo') as any;
/** key for Reactive Plugin Registration */								export const $Register: unique symbol = Symbol.for('magmacomputing/tempo/register') as any;
/** key for Internal Interpreter Service */								export const $Interpreter: unique symbol = Symbol.for('magmacomputing/tempo/interpreter') as any;
/** key for contextual Error Logging */										export const $logError: unique symbol = Symbol.for('magmacomputing/tempo/logError') as any;
/** key for contextual Debug Logging */										export const $logDebug: unique symbol = Symbol.for('magmacomputing/tempo/logDebug') as any;
/** key for contextual Debugger */												export const $dbg: unique symbol = Symbol.for('magmacomputing/tempo/dbg') as any;
/** key for Master Guard */																export const $guard: unique symbol = Symbol.for('magmacomputing/tempo/guard') as any;
/** internal key for signaling pre-errored state */				export const $errored: unique symbol = Symbol.for('magmacomputing/tempo/errored') as any;
/** internal key for accessing private instance state */	export const $Internal: unique symbol = Symbol.for('magmacomputing/tempo/internal') as any;
/** hardened globalThis bridge key for the TempoRuntime */export const $Bridge: unique symbol = Symbol.for('magmacomputing/tempo/runtime') as any;
/** cross-bundle brand check for TempoRuntime */					export const $RuntimeBrand: unique symbol = Symbol.for('magmacomputing/tempo/runtime/brand') as any;
/** branding for explicit PropertyDescriptors */					export const $Descriptor: unique symbol = Symbol.for('magmacomputing/tempo/descriptor') as any;

/** internal static config helper */											export const $setConfig: unique symbol = Symbol.for('magmacomputing/tempo/setConfig') as any;
/** internal static discovery helper */										export const $setDiscovery: unique symbol = Symbol.for('magmacomputing/tempo/setDiscovery') as any;
/** internal static event builder */											export const $setEvents: unique symbol = Symbol.for('magmacomputing/tempo/setEvents') as any;
/** internal static period builder */											export const $setPeriods: unique symbol = Symbol.for('magmacomputing/tempo/setPeriods') as any;
/** internal static guard builder */											export const $buildGuard: unique symbol = Symbol.for('magmacomputing/tempo/buildGuard') as any;
/** internal static base class marker */									export const $IsBase: unique symbol = Symbol.for('magmacomputing/tempo/isBase') as any;

/** @internal Tempo Symbol Registry (Local Keys) */
const local = {
	$Tempo, $Register, $Interpreter, $logError, $logDebug, $dbg, $guard, $errored,
	$Internal, $Bridge, $RuntimeBrand, $Descriptor, $setConfig, $setDiscovery,
	$setEvents, $setPeriods, $buildGuard, $IsBase
} as const;

/** @internal Unified Symbol Registry (Inherits from #library via Prototype Chain) */
export const sym = Object.assign(Object.create(lib), local) as Omit<typeof lib, '$Register'> & typeof local;

/** @internal Local type for brand checking without circular imports */
export type TempoBrand = {
	[sym.$Identity]: true;
	toDateTime(): Temporal.ZonedDateTime;
	config: any;
	parse: any;
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
	/** compact time (hhmiss) */															hms: Symbol('hourMinuteSecond'),
	/** compact day-month-year (ddmmyy) */										dmy6: Symbol('dayMonthYearShort'),
	/** compact month-day-year (mmddyy) */										mdy6: Symbol('monthDayYearShort'),
	/** compact year-month-day (yymmdd) */										ymd6: Symbol('yearMonthDayShort'),
	/** date and time */																			dtm: Symbol('dateTime'),
	/** time and date */																			tmd: Symbol('timeDate'),
	/** day-month-year */																			dmy: Symbol('dayMonthYear'),
	/** month-day-year */																			mdy: Symbol('monthDayYear'),
	/** year-month-day */																			ymd: Symbol('yearMonthDay'),
	/** day of month offset */																off: Symbol('offset'),
	/** weekDay */																						wkd: Symbol('weekDay'),
	/** relative offset (years, days, hours, etc) */					rel: Symbol('relativeOffset'),
	/** timezone/calendar brackets */													brk: Symbol('brackets'),
});
export type Token = typeof Token;
