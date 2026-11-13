import { defineTerm, getTermRange, defineRange, resolveCycleWindow, resolveRangeOrdinal, resolveRangeDiff, resolveRangeFormat, findTermPlugin, TermHook, $Internal, type TermSpan } from '@magmacomputing/tempo/plugin/sdk';
import { isString, isDefined, isUndefined, isInteger, isNumber, asArray, getCountryFromTimeZone, getLC } from '@magmacomputing/library';
import { logWarn } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';

/**
 * Valid fiscal quarter identifiers.
 */
export const FISCAL_KEYS = Object.freeze(['FQ1', 'FQ2', 'FQ3', 'FQ4'] as const);
export type FiscalKey = (typeof FISCAL_KEYS)[number];

/**
 * Configuration options for the FiscalTerm plugin.
 */
export interface FiscalTermOptions {
	/** Starting month of the fiscal year (1 to 12) */
	startMonth?: number;
	/** Starting day of the fiscal year month (1 to 28) */
	startDay?: number;
	/** ISO 3166-1 alpha-2 country code (e.g. 'AU', 'GB', 'US', 'JP') */
	country?: string;
}

/**
 * Standard national and jurisdictional fiscal year start month defaults.
 */
export const FISCAL_COUNTRY_DEFAULTS: Record<string, number> = Object.freeze({
	AU: 7,
	NZ: 7,
	EG: 7,
	KE: 7,
	PK: 7,
	GB: 4,
	UK: 4,
	JP: 4,
	CA: 4,
	IN: 4,
	SG: 4,
	HK: 4,
	US: 1,
	US_FED: 10,
	ZA: 3,
	EU: 1,
	CN: 1,
	BR: 1,
	MX: 1,
	DE: 1,
	FR: 1,
	IT: 1,
	ES: 1,
	NL: 1,
	CH: 1,
	SE: 1,
	NO: 1,
});

const FISCAL_REGION_KEYS = Object.freeze(Object.keys(FISCAL_COUNTRY_DEFAULTS).filter(k => /^[A-Z]{2}$/.test(k)));

function getFiscalOptions(t: Tempo, callOptions?: FiscalTermOptions): FiscalTermOptions {
	const state = (t as any)?.[$Internal]?.() ?? (t?.constructor as any)?.[$Internal]?.() ?? (t as any)?.state;
	const termObj = findTermPlugin('fqtr', state);
	const registeredOpts = (termObj as any)?.options;
	const config = (t as any).config ?? {};
	const pluginOpts = config.pluginOptions?.fiscal ?? config.fiscal ?? {};
	return { ...registeredOpts, ...pluginOpts, ...callOptions };
}

function getCountryDefaultMonth(code: string | undefined): number | undefined {
	if (!isString(code)) return undefined;
	const key = code.toUpperCase();
	if (Object.hasOwn(FISCAL_COUNTRY_DEFAULTS, key)) {
		const val = FISCAL_COUNTRY_DEFAULTS[key];
		return isNumber(val) ? val : undefined;
	}
	return undefined;
}

function getLocaleRegion(t: Tempo): string | undefined {
	const config = (t as any).config ?? {};
	const locale = (t as any).locale ?? config.locale;
	return isString(locale) ? getLC(locale)?.region : undefined;
}

function getExplicitOptions(t: Tempo): Record<string, any> {
	return ((t as any)?.[$Internal]?.()?.options as Record<string, any>) ?? {};
}

/**
 * Resolves the start month for the fiscal year based on explicit options,
 * country presets, geographical coordinates, or locale regional identification.
 * Follows the refuse-to-guess policy when jurisdiction cannot be resolved.
 *
 * @param t - Source Tempo instance
 * @param callOptions - Options passed at call site or factory
 * @returns Start month (1..12) or undefined
 * @internal
 */
export function resolveFiscalStartMonth(t: Tempo, callOptions?: FiscalTermOptions): number | undefined {
	const config = (t as any).config ?? {};
	const opts = getFiscalOptions(t, callOptions);

	const rawStartMonth = opts.startMonth;
	const rawCountry = opts.country;

	const validStartMonth = isInteger(rawStartMonth) && rawStartMonth >= 1 && rawStartMonth <= 12
		? rawStartMonth
		: undefined;
	if (isDefined(rawStartMonth) && isUndefined(validStartMonth)) {
		logWarn(`[tempo] FiscalTerm ignoring invalid startMonth ${rawStartMonth}; expected an integer from 1 to 12.`, config);
	}

	// Conflict detection: if both startMonth and country are provided and diverge
	if (isDefined(validStartMonth) && isString(rawCountry)) {
		const countryDefault = getCountryDefaultMonth(rawCountry);
		if (isDefined(countryDefault) && countryDefault !== validStartMonth) {
			logWarn(
				`[tempo] FiscalTerm received conflicting options: country '${rawCountry}' (default start month ${countryDefault}) and explicit startMonth ${validStartMonth}. Prioritizing startMonth: ${validStartMonth}.`,
				config
			);
		}
	}

	// 1. Explicit startMonth override
	if (isDefined(validStartMonth))
		return validStartMonth;

	// 2. Explicit country override
	if (isString(rawCountry)) {
		const month = getCountryDefaultMonth(rawCountry);
		if (isDefined(month)) return month;
		logWarn(`[tempo] FiscalTerm received unrecognized country '${rawCountry}'; expected an ISO 3166-1 alpha-2 code with known fiscal defaults.`, config);
		return undefined;
	}

	// 3. Geographic country from t.geo.country
	const geoCountry = (t as any).geo?.country;
	if (isString(geoCountry)) {
		const month = getCountryDefaultMonth(geoCountry);
		if (isDefined(month)) return month;
	}

	const explicitOpts = getExplicitOptions(t);
	const hasExplicitLocale = isDefined(explicitOpts.locale ?? explicitOpts.Locale);
	const hasExplicitTimeZone = isDefined(explicitOpts.timeZone ?? explicitOpts.timezone ?? explicitOpts.TimeZone);

	// 4. Explicit instance locale regional subtag
	if (hasExplicitLocale) {
		const region = getLocaleRegion(t);
		if (region) {
			const month = getCountryDefaultMonth(region);
			if (isDefined(month)) return month;
		}
	}

	// 5. Explicit instance timeZone (e.g. 'America/New_York' -> 'US')
	if (hasExplicitTimeZone) {
		const tzCountry = getCountryFromTimeZone((t as any).timeZone ?? config.timeZone, FISCAL_REGION_KEYS);
		if (isString(tzCountry)) {
			const month = getCountryDefaultMonth(tzCountry);
			if (isDefined(month)) return month;
		}
	}

	// 6. Ambient/default locale regional subtag (when locale was not explicitly provided)
	if (!hasExplicitLocale) {
		const region = getLocaleRegion(t);
		if (region) {
			const month = getCountryDefaultMonth(region);
			if (isDefined(month)) return month;
		}
	}

	// 7. Refuse to guess
	logWarn(`[tempo] FiscalTerm requires an explicit country, startMonth, or locale region to determine fiscal quarters.`, config);
	return undefined;
}

/**
 * Resolves the starting day-of-month for the fiscal year (1 to 28, defaulting to 1).
 *
 * @param t - Source Tempo instance
 * @param callOptions - Options passed at call site or factory
 * @returns Validated start day (1..28)
 * @internal
 */
export function resolveFiscalStartDay(t: Tempo, callOptions?: FiscalTermOptions): number {
	const config = (t as any).config ?? {};
	const opts = getFiscalOptions(t, callOptions);
	const rawStartDay = opts.startDay;

	if (isUndefined(rawStartDay)) return 1;
	if (isInteger(rawStartDay) && rawStartDay >= 1 && rawStartDay <= 28) return rawStartDay;

	logWarn(`[tempo] FiscalTerm ignoring invalid startDay ${rawStartDay}; expected an integer from 1 to 28.`, config);
	return 1;
}

function resolveFiscalCountry(t: Tempo, opts: FiscalTermOptions, startMonth: number): string | undefined {
	const rawCountry = opts.country;
	if (isString(rawCountry)) {
		return getCountryDefaultMonth(rawCountry) === startMonth ? rawCountry.toUpperCase() : undefined;
	}

	const rawStartMonth = opts.startMonth;
	if (isInteger(rawStartMonth) && rawStartMonth >= 1 && rawStartMonth <= 12) return undefined;

	const geoCountry = (t as any).geo?.country;
	if (isString(geoCountry) && getCountryDefaultMonth(geoCountry) === startMonth) {
		return geoCountry.toUpperCase();
	}

	const config = (t as any).config ?? {};
	const explicitOpts = getExplicitOptions(t);
	const hasExplicitLocale = isDefined(explicitOpts.locale ?? explicitOpts.Locale);
	const hasExplicitTimeZone = isDefined(explicitOpts.timeZone ?? explicitOpts.timezone ?? explicitOpts.TimeZone);

	if (hasExplicitLocale) {
		const region = getLocaleRegion(t);
		if (region && getCountryDefaultMonth(region) === startMonth) return region.toUpperCase();
	}

	if (hasExplicitTimeZone) {
		const tzCountry = getCountryFromTimeZone((t as any).timeZone ?? config.timeZone, FISCAL_REGION_KEYS);
		if (isString(tzCountry) && getCountryDefaultMonth(tzCountry) === startMonth) return tzCountry;
	}

	if (!hasExplicitLocale) {
		const region = getLocaleRegion(t);
		if (region && getCountryDefaultMonth(region) === startMonth) return region.toUpperCase();
	}
	return undefined;
}

/**
 * Projects a Tempo or anchor instance into the ISO 8601 calendar,
 * preserving the target instant and time zone.
 */
function toIsoTempo(target: any, fallback: Tempo): Tempo {
	const ref = target ?? fallback;
	const zdt = typeof ref?.toDateTime === 'function'
		? ref.toDateTime()
		: (ref?.calendarId !== undefined && typeof ref?.withCalendar === 'function' ? ref : undefined);

	if (zdt) {
		const Host = fallback.constructor as any;
		const explicitOpts = getExplicitOptions(fallback);
		if (zdt.calendarId !== 'iso8601') {
			const isoZdt = zdt.withCalendar('iso8601');
			return new Host(isoZdt, { ...explicitOpts, calendar: 'iso8601' });
		}
		if (!(ref instanceof fallback.constructor))
			return new Host(zdt, explicitOpts);
		}
	return ref;
}

/**
 * Resolves fiscal quarter ranges for the active fiscal start month.
 *
 * @param t - Source Tempo instance
 * @param anchor - Optional reference time override
 * @param options - Optional fiscal configuration options
 * @returns Array of matching fiscal quarter ranges or empty array
 * @internal
 */
function resolve(t: Tempo, anchor?: any, options?: FiscalTermOptions): any[] {
	const isoHost = toIsoTempo(anchor, t);
	const startMonth = resolveFiscalStartMonth(t, options);
	if (isUndefined(startMonth)) return [];

	const startDay = resolveFiscalStartDay(t, options);
	const rawRanges = [
		{ key: 'FQ1', day: startDay, month: ((startMonth - 1 + 0) % 12) + 1, year: Math.floor((startMonth - 1 + 0) / 12), label: 'First Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
		{ key: 'FQ2', day: startDay, month: ((startMonth - 1 + 3) % 12) + 1, year: Math.floor((startMonth - 1 + 3) / 12), label: 'Second Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
		{ key: 'FQ3', day: startDay, month: ((startMonth - 1 + 6) % 12) + 1, year: Math.floor((startMonth - 1 + 6) / 12), label: 'Third Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
		{ key: 'FQ4', day: startDay, month: ((startMonth - 1 + 9) % 12) + 1, year: Math.floor((startMonth - 1 + 9) / 12), label: 'Fourth Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
	];

	const groups = defineRange(rawRanges);
	return resolveCycleWindow(isoHost, groups, { anchor: isoHost });
}

/**
 * ## FiscalTerm
 * Corporate and jurisdictional fiscal quarter and year tracking.
 */
export const FiscalTerm = defineTerm<any, FiscalTermOptions>({
	key: 'fqtr',
	scope: 'fiscal',
	aliases: ['fiscal'],
	description: 'Fiscal Quarter',
	keys: FISCAL_KEYS,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor, getFiscalOptions(this, (this as any).options));
	},

	define(this: Tempo, keyOnly?: boolean | number | string, anchor?: any) {
		const isoHost = toIsoTempo(anchor, this);
		const opts = getFiscalOptions(this, (this as any).options);
		const res = resolve(this, anchor, opts);
		if (!res || res.length === 0) return undefined;

		const startMonth = res[0]?._startMonth ?? 1;
		const startDay = res[0]?._startDay ?? 1;
		const country = resolveFiscalCountry(this, opts, startMonth);
		const scope = getTermRange(isoHost, asArray(res), keyOnly as any, isoHost, {
			startMonth,
			startDay,
			country,
		}) as any;
		if (scope && typeof scope === 'object') {
			const start = scope.span.start;
			const isPastStart = (start.mm > startMonth) || (start.mm === startMonth && start.dd >= startDay);
			const year = (startMonth > 1 || startDay > 1) && isPastStart ? start.yy + 1 : start.yy;
			const { _startMonth, _startDay, ...cleanScope } = scope;
			return {
				...cleanScope,
				year,
				keys: FISCAL_KEYS,
			};
		}
		return scope;
	},

	[TermHook.ordinal](this: any, groups: Record<string, any>, anchor: Tempo) {
		return resolveRangeOrdinal(this, groups, anchor);
	},

	[TermHook.diff](this: any, other: Tempo, unit: string, tempo: Tempo) {
		return resolveRangeDiff(this, other, unit, tempo);
	},

	[TermHook.format](this: any, token: string, tempo: Tempo) {
		return resolveRangeFormat(this, token, tempo);
	}
});

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		fqtr: FiscalKey | undefined;
		fiscal: {
			key: FiscalKey;
			label: 'First Fiscal Quarter' | 'Second Fiscal Quarter' | 'Third Fiscal Quarter' | 'Fourth Fiscal Quarter';
			year: number;
			keys: readonly FiscalKey[];
			span: TermSpan;
			config?: Readonly<{
				startMonth: number;
				startDay: number;
				country?: string;
			}>;
		} | undefined;
	}
}
