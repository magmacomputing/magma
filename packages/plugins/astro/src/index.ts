import { Tempo } from '@magmacomputing/tempo';
import { enums, getTermRange, defineTerm, enumify, type ValueOf } from '@magmacomputing/tempo/plugin/sdk';
import { getSolarEvents as getSolarEventsFn } from '@magmacomputing/tempo-fns';

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		astro: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
		equinox: 'Vernal' | 'Autumnal';
		solstice: 'Summer' | 'Winter';
		astronomy: {
			key: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
			strict: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
			season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
			sphere: Tempo.COMPASS;
			event: 'Equinox' | 'Solstice';
			group: 'astronomy';
			year: number;
			month: number;
			day: number;
			hour: number;
			minute: number;
			second: number;
			millisecond: number;
			microsecond: number;
			nanosecond: number;
			start: Tempo;
			end: Tempo;
		};
	}
}

const ASTRO = enumify({ Vernal: 'vernal', Summer: 'summer', Autumnal: 'autumnal', Winter: 'winter' });
type ASTRO = ValueOf<typeof ASTRO>;

const { COMPASS } = enums;
const key = 'astro';
const scope = 'astronomy';

/**
 * Polynomial approximation for Equinoxes and Solstices (Jean Meeus algorithm).
 */
function calculateAstroMoment(year: number, quarter: ASTRO, timeZone: string) {
	const events = getSolarEventsFn(year);
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
 * Exposes precise astronomical calculations (equinoxes and solstices)
 * as a standard Tempo scope (`t.term.astro` & `t.term.astronomy`).
 */
export const AstroTerm = defineTerm({
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
});

export const AstroPlugin = [AstroTerm];
export default AstroPlugin;

// Side-effect: Auto-register upon import
Tempo.extend(AstroPlugin);
