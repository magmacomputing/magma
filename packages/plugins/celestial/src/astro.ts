import { Tempo } from '@magmacomputing/tempo';
import { enums, getTermRange, defineSpan, defineTerm, enumify, type ValueOf, WeakCache, TermHook, isNumber, resolveTermSphere, logWarn, type TermSpan } from '@magmacomputing/tempo/plugin/sdk';
import { getSolarEvents as getSolarEventsFn } from '@magmacomputing/tempo-fns';

const ASTRO = enumify({ Vernal: 'vernal', Summer: 'summer', Autumnal: 'autumnal', Winter: 'winter' });
type ASTRO = ValueOf<typeof ASTRO>;

export const ASTRO_KEYS = Object.freeze(['Vernal', 'Summer', 'Autumnal', 'Winter'] as const);
export type AstroKey = (typeof ASTRO_KEYS)[number];

export interface AstronomyScope {
	key: AstroKey;
	strict: AstroKey;
	season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
	sphere: Tempo.COMPASS;
	event: 'Equinox' | 'Solstice';
	keys: readonly AstroKey[];
	group: 'astronomy';
	span: TermSpan;
}

export type AstroScope = AstronomyScope;

const { COMPASS } = enums;
const key = 'astro';
const scope = 'astronomy';

const SOLAR_EVENTS_CACHE = new WeakCache<number, ReturnType<typeof getSolarEventsFn>>();

/**
 * Returns equinox and solstice events, reusing the weakly cached result for the year.
 *
 * @param year - The year for which to calculate solar events
 * @returns The cached or newly calculated solar events
 */
function getSolarEvents(year: number) {
	const cached = SOLAR_EVENTS_CACHE.get(year);
	if (cached) return cached;
	const events = getSolarEventsFn(year);
	SOLAR_EVENTS_CACHE.set(year, events);
	return events;
}

/**
 * Polynomial approximation for Equinoxes and Solstices (Jean Meeus algorithm).
 */
function calculateAstroMoment(year: number, quarter: ASTRO, timeZone: string) {
	const events = getSolarEvents(year);
	let keyName: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter' = 'Vernal';
	if (quarter === ASTRO.Summer) keyName = 'Summer';
	else if (quarter === ASTRO.Autumnal) keyName = 'Autumnal';
	else if (quarter === ASTRO.Winter) keyName = 'Winter';

	const match = events.find(e => e.key === keyName);
	const epochMs = match ? match.epochMs : Date.now();
	return new Tempo(epochMs, { timeZone, timeStamp: 'ms' });
}

function resolve(t: Tempo, anchor?: any) {
	const sphere = resolveTermSphere(anchor?.sphere ?? t.sphere, 'AstroTerm', t.config);
	if (!sphere || sphere === 'equator') {
		if (sphere === 'equator') {
			logWarn(`[tempo] AstroTerm requires an explicit hemisphere of 'north' or 'south' (received: "equator").`, t.config);
		}
		return [];
	}

	const isSouth = sphere === 'south';
	const compassSphere = isSouth ? COMPASS.South : COMPASS.North;
	const year = anchor?.yy ?? anchor?.year ?? t.yy;
	const timeZone = anchor?.tz ?? anchor?.timeZoneId ?? (typeof anchor?.toDateTime === 'function' ? anchor.toDateTime().timeZoneId : undefined) ?? t.tz ?? 'UTC';
	const list: any[] = [];

	const labels = isSouth
		? { vernal: 'Autumnal', summer: 'Winter', autumnal: 'Vernal', winter: 'Summer' } as const
		: { vernal: 'Vernal', summer: 'Summer', autumnal: 'Autumnal', winter: 'Winter' } as const;

	const seasons = isSouth
		? { vernal: 'Autumn', summer: 'Winter', autumnal: 'Spring', winter: 'Summer' } as const
		: { vernal: 'Spring', summer: 'Summer', autumnal: 'Autumn', winter: 'Winter' } as const;

	for (const y of [year - 1, year, year + 1]) {
		const m = (y: number, t: any) => {
			const moment = calculateAstroMoment(y, t, timeZone);
			const dt = moment.toDateTime();

			return {
				year: dt.year, month: dt.month, day: dt.day,
				hour: dt.hour, minute: dt.minute, second: dt.second,
				millisecond: dt.millisecond, microsecond: dt.microsecond, nanosecond: dt.nanosecond,
			};
		};

		list.push({ key: labels.vernal, season: seasons.vernal, sphere: compassSphere, ...m(y, ASTRO.Vernal), event: 'Equinox', group: 'astronomy' });
		list.push({ key: labels.summer, season: seasons.summer, sphere: compassSphere, ...m(y, ASTRO.Summer), event: 'Solstice', group: 'astronomy' });
		list.push({ key: labels.autumnal, season: seasons.autumnal, sphere: compassSphere, ...m(y, ASTRO.Autumnal), event: 'Equinox', group: 'astronomy' });
		list.push({ key: labels.winter, season: seasons.winter, sphere: compassSphere, ...m(y, ASTRO.Winter), event: 'Solstice', group: 'astronomy' });
	}

	return list;
}

function resolveFiltered(t: Tempo, anchor?: any, eventFilter?: 'Equinox' | 'Solstice') {
	const list = resolve(t, anchor);
	if (!eventFilter) return list;
	return list.filter((item: any) => item.event === eventFilter);
}

function resolveDateBoundaryFiltered(t: Tempo, anchor?: any, eventFilter?: 'Equinox' | 'Solstice') {
	const list = resolveFiltered(t, anchor, eventFilter);
	return list.map((item: any) => ({ ...item, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 }));
}

/**
 * Options for configuring the Astronomical Term plugin.
 */
export interface AstroTermOptions {
	sphere?: 'north' | 'south';
	hemisphere?: 'north' | 'south';
	precision?: 'standard' | 'high';
	[key: string]: any;
}

/**
 * Exposes precise astronomical calculations (equinoxes and solstices)
 * as a standard Tempo scope (`t.term.astro` & `t.term.astronomy`).
 */
export const AstroTerm = defineTerm<any, AstroTermOptions>({
	key,
	aliases: ['equinox', 'solstice'],
	scope,
	description: 'Astronomical seasons and events',
	keys: ASTRO_KEYS,
	resolve(this: Tempo, anchor?: any, alias?: string) {
		const filterType = alias === 'equinox' ? 'Equinox' : (alias === 'solstice' ? 'Solstice' : undefined);
		return resolveFiltered(this, anchor, filterType);
	},
	define(this: Tempo, keyOnly?: boolean, anchor?: any, alias?: string) {
		const filterType = alias === 'equinox' ? 'Equinox' : (alias === 'solstice' ? 'Solstice' : undefined);
		const strictList = resolveFiltered(this, anchor, filterType);
		const dateBoundaryList = resolveDateBoundaryFiltered(this, anchor, filterType);
		const zdt = (anchor instanceof Tempo ? anchor.toDateTime() : anchor) ?? (this instanceof Tempo ? this.toDateTime() : new Tempo(this).toDateTime());

		if (keyOnly === true || keyOnly === undefined) {
			const result = getTermRange(this, dateBoundaryList, true, anchor);
			return result;
		}

		const scoped = getTermRange(this, strictList, false, anchor) as any;
		if (!scoped) return scoped;

		const dateScoped = getTermRange(this, dateBoundaryList, false, anchor) as any;
		if (!dateScoped) return scoped;

		const dateStart = dateScoped.span?.start?.toDateTime?.().withCalendar('iso8601');
		const strictBoundary = dateStart ? strictList.find((item: any) =>
			item.key === dateScoped.key &&
			item.year === dateStart.year &&
			item.month === dateStart.month &&
			item.day === dateStart.day
		) : undefined;

		if (!strictBoundary) {
			return {
				...dateScoped,
				strict: scoped.key,
				keys: ASTRO_KEYS,
			};
		}

		const boundaryAnchor = zdt.with({
			year: strictBoundary.year,
			month: strictBoundary.month,
			day: strictBoundary.day,
			hour: strictBoundary.hour ?? 0,
			minute: strictBoundary.minute ?? 0,
			second: strictBoundary.second ?? 0,
			millisecond: strictBoundary.millisecond ?? 0,
			microsecond: strictBoundary.microsecond ?? 0,
			nanosecond: strictBoundary.nanosecond ?? 0,
		}).add({ minutes: 1 });

		const keyedScope = getTermRange(this, strictList, false, boundaryAnchor) as any;
		if (!keyedScope) {
			return {
				...dateScoped,
				strict: scoped.key,
				keys: ASTRO_KEYS,
			};
		}

		return {
			...keyedScope,
			span: defineSpan(this, keyedScope.span.start, keyedScope.span.end, zdt),
			strict: scoped.key,
			keys: ASTRO_KEYS,
		};
	},

	[TermHook.ordinal](groups: Record<string, any>, anchor: Tempo) {
		const ord = groups.ord?.toLowerCase();
		const termLower = (groups.term || '').toLowerCase();
		const year = anchor?.yy ?? new Tempo().yy;
		const events = getSolarEvents(year);

		const filterType = termLower.includes('equinox')
			? 'Equinox'
			: (termLower.includes('solstice') ? 'Solstice' : undefined);

		const matching = filterType ? events.filter(e => e.event === filterType) : [...events];
		matching.sort((a, b) => a.epochMs - b.epochMs);

		const ordMap = Tempo.enums.ORDINAL as Record<string, number>;
		const rawVal = groups.value ?? ordMap?.[ord];
		const val = isNumber(rawVal)
			? rawVal
			: (ord === 'last' ? -1 : (parseInt(rawVal ?? ord, 10) || ordMap?.[ord]));

		if (!val) return undefined;

		const index = val < 0 ? matching.length + val + 1 : val;
		if (index < 1 || index > matching.length) return undefined;

		const target = matching[index - 1];
		return new Tempo(target.epochMs, { timeZone: anchor?.tz ?? 'UTC', timeStamp: 'ms', ...(anchor?.sphere ? { sphere: anchor.sphere } : {}) });
	},

	[TermHook.parse](input: string, context?: any) {
		const lower = input.toLowerCase();
		if (lower.startsWith('#astro.') || lower.startsWith('#equinox.') || lower.startsWith('#solstice.')) {
			const parts = lower.slice(1).split('.');
			if (parts.length !== 2) return undefined;
			const [prefix, sub] = parts;
			const isEquinox = sub === 'vernal' || sub === 'spring' || sub === 'autumnal' || sub === 'autumn';
			const isSolstice = sub === 'summer' || sub === 'winter';
			if (prefix === 'equinox' && !isEquinox) return undefined;
			if (prefix === 'solstice' && !isSolstice) return undefined;

			const year = context?.anchor?.yy ?? context?.anchor?.year ?? new Tempo().yy;
			const timeZone = context?.anchor?.tz ?? 'UTC';
			const sphere = resolveTermSphere(context?.anchor?.sphere ?? context?.config?.sphere, 'AstroTerm', context?.config);
			if (!sphere || sphere === 'equator') return undefined;

			const isSouth = sphere === 'south';

			let quarter: ASTRO | undefined;
			if (isEquinox) {
				if (sub === 'vernal' || sub === 'spring') quarter = isSouth ? ASTRO.Autumnal : ASTRO.Vernal;
				else quarter = isSouth ? ASTRO.Vernal : ASTRO.Autumnal;
			} else if (isSolstice) {
				if (sub === 'summer') quarter = isSouth ? ASTRO.Winter : ASTRO.Summer;
				else quarter = isSouth ? ASTRO.Summer : ASTRO.Winter;
			}

			if (quarter) {
				const moment = calculateAstroMoment(year, quarter, timeZone);
				return new Tempo(moment.epoch.ms, { timeZone, timeStamp: 'ms', sphere });
			}
		}
		return undefined;
	},

	[TermHook.bound](boundary: 'start' | 'mid' | 'end', _unit: string, tempo: Tempo) {
		const target = tempo instanceof Tempo ? tempo : new Tempo(tempo);
		const scope = AstroTerm.define.call(target, false) as any;
		const start = scope?.span?.start;
		const end = scope?.span?.end;
		if (start && end) {
			if (boundary === 'start') return start;
			if (boundary === 'end') return end.sub({ nanoseconds: 1 });
			if (boundary === 'mid') {
				const midMs = Math.round((start.epoch.ms + end.epoch.ms) / 2);
				return new Tempo(midMs, { timeZone: start.tz, timeStamp: 'ms', ...(target.sphere ? { sphere: target.sphere } : {}) });
			}
		}
		return undefined;
	},

	[TermHook.format](token: string, tempo: Tempo) {
		const t = token.toLowerCase();
		if (t === '#astro' || t === '#astronomy' || t === '#equinox' || t === '#solstice' || t === '#astro.season' || t === '#astro.event' || t === '#astro.key') {
			const alias = t === '#equinox' ? 'equinox' : (t === '#solstice' ? 'solstice' : undefined);
			const scope = AstroTerm.define.call(tempo, false, undefined, alias) as any;
			if (scope) {
				if (t === '#astro.season') return scope.season;
				if (t === '#astro.event') return scope.event;
				if (t === '#astro.key') return scope.key;
				return `${scope.key} ${scope.event}`;
			}
		}
		return undefined;
	},
});

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		astro: AstroKey;
		equinox: 'Vernal' | 'Autumnal';
		solstice: 'Summer' | 'Winter';
		astronomy: AstronomyScope;
	}
}
