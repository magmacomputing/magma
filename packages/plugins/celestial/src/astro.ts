import { Tempo } from '@magmacomputing/tempo';
import { enums, getTermRange, defineTerm, enumify, type ValueOf, WeakCache, TermHook } from '@magmacomputing/tempo/plugin/sdk';
import { getSolarEvents as getSolarEventsFn } from '@magmacomputing/tempo-fns';

const ASTRO = enumify({ Vernal: 'vernal', Summer: 'summer', Autumnal: 'autumnal', Winter: 'winter' });
type ASTRO = ValueOf<typeof ASTRO>;

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
	const sphere = t.sphere;
	if (!sphere) return [];

	const year = anchor?.yy ?? anchor?.year ?? t.yy;
	const timeZone = anchor?.timeZoneId ?? t.tz ?? 'UTC';
	const list: any[] = [];

	const labels = (sphere === COMPASS.South)
		? { vernal: 'Autumnal', summer: 'Winter', autumnal: 'Vernal', winter: 'Summer' } as const
		: { vernal: 'Vernal', summer: 'Summer', autumnal: 'Autumnal', winter: 'Winter' } as const;

	const seasons = (sphere === COMPASS.South)
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

		list.push({ key: labels.vernal, season: seasons.vernal, sphere, ...m(y, ASTRO.Vernal), event: 'Equinox', group: 'astronomy' });
		list.push({ key: labels.summer, season: seasons.summer, sphere, ...m(y, ASTRO.Summer), event: 'Solstice', group: 'astronomy' });
		list.push({ key: labels.autumnal, season: seasons.autumnal, sphere, ...m(y, ASTRO.Autumnal), event: 'Equinox', group: 'astronomy' });
		list.push({ key: labels.winter, season: seasons.winter, sphere, ...m(y, ASTRO.Winter), event: 'Solstice', group: 'astronomy' });
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
	resolve(this: Tempo, anchor?: any, alias?: string) {
		const filterType = alias === 'equinox' ? 'Equinox' : (alias === 'solstice' ? 'Solstice' : undefined);
		return resolveFiltered(this, anchor, filterType);
	},
	define(this: Tempo, keyOnly?: boolean, anchor?: any, alias?: string) {
		const filterType = alias === 'equinox' ? 'Equinox' : (alias === 'solstice' ? 'Solstice' : undefined);
		const strictList = resolveFiltered(this, anchor, filterType);
		const dateBoundaryList = resolveDateBoundaryFiltered(this, anchor, filterType);
		const zdt = anchor ?? (this as any).toDateTime();

		if (keyOnly === true || keyOnly === undefined) {
			const result = getTermRange(this, dateBoundaryList, true, anchor);
			return result;
		}

		const scoped = getTermRange(this, strictList, false, anchor) as any;
		if (!scoped) return scoped;

		const dateScoped = getTermRange(this, dateBoundaryList, false, anchor) as any;
		if (!dateScoped) return scoped;

		const strictBoundary = strictList.find((item: any) =>
			item.key === dateScoped.key &&
			item.year === dateScoped.year &&
			item.month === dateScoped.month &&
			item.day === dateScoped.day
		);

		if (!strictBoundary) {
			return {
				...dateScoped,
				strict: scoped.key,
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
			};
		}

		return {
			...keyedScope,
			strict: scoped.key,
		};
	},

	[TermHook.ordinal](groups: Record<string, string>, anchor: Tempo) {
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
		const index = ord === 'last' ? matching.length : (parseInt(ord, 10) || ordMap?.[ord]);
		if (!index || index < 1 || index > matching.length) return undefined;

		const target = matching[index - 1];
		return new Tempo(target.epochMs, { timeZone: anchor?.tz ?? 'UTC', timeStamp: 'ms', ...(anchor?.sphere ? { sphere: anchor.sphere } : {}) });
	},

	[TermHook.parse](input: string, context?: any) {
		const lower = input.toLowerCase();
		if (lower.startsWith('#astro.') || lower.startsWith('#equinox.') || lower.startsWith('#solstice.')) {
			const sub = lower.split('.')[1];
			const year = context?.anchor?.yy ?? context?.anchor?.year ?? new Tempo().yy;
			const timeZone = context?.anchor?.tz ?? 'UTC';
			const sphere = context?.anchor?.sphere ?? 'north';
			const isSouth = sphere === 'south';

			let quarter: ASTRO | undefined;
			if (sub === 'vernal' || sub === 'spring') quarter = isSouth ? ASTRO.Autumnal : ASTRO.Vernal;
			else if (sub === 'summer') quarter = isSouth ? ASTRO.Winter : ASTRO.Summer;
			else if (sub === 'autumnal' || sub === 'autumn') quarter = isSouth ? ASTRO.Vernal : ASTRO.Autumnal;
			else if (sub === 'winter') quarter = isSouth ? ASTRO.Summer : ASTRO.Winter;

			if (quarter) {
				const moment = calculateAstroMoment(year, quarter, timeZone);
				return new Tempo(moment.epoch.ms, { timeZone, timeStamp: 'ms', ...(sphere ? { sphere } : {}) });
			}
		}
		return undefined;
	},

	[TermHook.bound](boundary: 'start' | 'mid' | 'end', _unit: string, tempo: Tempo) {
		const scope = AstroTerm.define.call(tempo, false) as any;
		if (scope?.start && scope?.end) {
			if (boundary === 'start') return scope.start;
			if (boundary === 'end') return scope.end.sub({ nanoseconds: 1 });
			if (boundary === 'mid') {
				const midMs = Math.round((scope.start.epoch.ms + scope.end.epoch.ms) / 2);
				return new Tempo(midMs, { timeZone: scope.start.tz, timeStamp: 'ms', ...(tempo.sphere ? { sphere: tempo.sphere } : {}) });
			}
		}
		return undefined;
	},

	[TermHook.format](token: string, tempo: Tempo) {
		const t = token.toLowerCase();
		if (t === '#astro' || t === '#astronomy' || t === '#equinox' || t === '#solstice' || t.startsWith('#astro.')) {
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
