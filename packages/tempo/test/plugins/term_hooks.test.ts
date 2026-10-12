import { Tempo, TermHook } from '#tempo';
import { defineTerm } from '#tempo/plugin/term/term.util.js';
import { EasternTerm, TimelineTerm } from '#tempo/std';

describe('Term Plugin Lifecycle Hooks (Phase 1)', () => {
	beforeEach(() => {
		Tempo.init();
	});

	it('should verify well-known Symbol.for identities for all 6 lifecycle hooks', () => {
		expect(TermHook.parse).toBe(Symbol.for('magmacomputing/tempo/term/parse'));
		expect(TermHook.ordinal).toBe(Symbol.for('magmacomputing/tempo/term/ordinal'));
		expect(TermHook.step).toBe(Symbol.for('magmacomputing/tempo/term/step'));
		expect(TermHook.diff).toBe(Symbol.for('magmacomputing/tempo/term/diff'));
		expect(TermHook.bound).toBe(Symbol.for('magmacomputing/tempo/term/bound'));
		expect(TermHook.format).toBe(Symbol.for('magmacomputing/tempo/term/format'));
	});

	it('should dispatch [TermHook.parse] during string parsing', () => {
		const parseCalls: any[] = [];
		const CustomHolidayTerm = defineTerm({
			key: 'holiday',
			scope: 'holiday',
			description: 'Custom Holiday Hook Test',
			define() {
				return undefined;
			},
			[TermHook.parse](input: string, context: any) {
				parseCalls.push({ input, context });
				if (input === '#holiday.fest') {
					return new Tempo('2026-12-25T00:00:00Z');
				}
				return undefined;
			}
		});

		Tempo.use(CustomHolidayTerm);

		const t = new Tempo('#holiday.fest');
		expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-25');
		expect(parseCalls.length).toBe(1);
		expect(parseCalls[0].input).toBe('#holiday.fest');
		expect(parseCalls[0].context).toBeDefined();
	});

	it('should dispatch [TermHook.ordinal] during anchored ordinal parsing', () => {
		const ordinalCalls: any[] = [];
		const CustomCycleTerm = defineTerm({
			key: 'sprint',
			scope: 'sprint',
			description: 'Sprint cycle term',
			define() {
				return undefined;
			},
			[TermHook.ordinal](groups: Record<string, string>, anchor: any) {
				ordinalCalls.push({ groups, anchor });
				// 3rd day of #sprint.4 -> advance anchor by 3 days
				return anchor.add({ days: 3 });
			}
		});

		Tempo.use(CustomCycleTerm);

		const anchor = new Tempo('2026-03-01T00:00:00Z');
		const t = Tempo.from('3rd day of #sprint.4', { anchor });
		expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-04');
		expect(ordinalCalls.length).toBe(1);
		expect(ordinalCalls[0].groups.ord).toBe('3rd');
		expect(ordinalCalls[0].groups.term).toBe('#sprint.4');
	});

	it('should support written ordinals in [TermHook.ordinal] and return undefined when unresolvable', () => {
		const SprintTerm = defineTerm({
			key: 'sprintdoc',
			scope: 'sprintdoc',
			description: 'Sprint cycle term with written ordinal support',
			define() {
				return undefined;
			},
			[TermHook.ordinal](groups: Record<string, string>, anchor: any) {
				const ord = groups.ord?.toLowerCase();
				const dayOffset = ord === 'last' ? 14 : (parseInt(ord, 10) || Tempo.enums.ORDINAL[ord]);
				if (!dayOffset) return undefined;
				return anchor.add({ days: dayOffset - 1 });
			}
		});

		Tempo.use(SprintTerm);

		const anchor = new Tempo('2026-03-01T00:00:00Z');
		const tSecond = Tempo.from('second day of #sprintdoc.1', { anchor });
		expect(tSecond.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-02');

		const tLast = Tempo.from('last day of #sprintdoc.1', { anchor });
		expect(tLast.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-14');

		const t3rd = Tempo.from('3rd day of #sprintdoc.1', { anchor });
		expect(t3rd.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-03');

		const tTenth = Tempo.from('tenth day of #sprintdoc.1', { anchor });
		expect(tTenth.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-10');
	});

	it('should pass resolved local ordinal value to [TermHook.ordinal]', () => {
		let capturedGroups: any;
		const HookedTerm = defineTerm({
			key: 'customhook',
			scope: 'customhook',
			define() { return undefined; },
			[TermHook.ordinal](groups: Record<string, any>, anchor: any) {
				capturedGroups = groups;
				return anchor;
			}
		});
		Tempo.use(HookedTerm);
		const anchor = new Tempo('2026-01-01T00:00:00Z');
		const t = Tempo.from('penultimate day of #customhook', {
			anchor,
			registry: { ordinals: { penultimate: -2 } }
		});
		expect(t.isValid).toBe(true);
		expect(capturedGroups).toBeDefined();
		expect(capturedGroups.ord).toBe('penultimate');
		expect(capturedGroups.value).toBe(-2);

		// Case-insensitive matching with differently-cased configured ordinals
		let mixedGroups: any;
		const CaseHook = defineTerm({
			key: 'casehook',
			scope: 'casehook',
			define() { return undefined; },
			[TermHook.ordinal](groups: Record<string, any>, anchor: any) {
				mixedGroups = groups;
				return anchor;
			}
		});
		Tempo.use(CaseHook);
		const tCase = Tempo.from('PENULTIMATE day of #casehook', {
			anchor,
			registry: { ordinals: { Penultimate: -2 } }
		});
		expect(tCase.isValid).toBe(true);
		expect(mixedGroups).toBeDefined();
		expect(mixedGroups.ord.toLowerCase()).toBe('penultimate');
		expect(mixedGroups.value).toBe(-2);
	});

	it('should support negative ordinals like "-2nd day of #cycle.2" in [TermHook.ordinal]', () => {
		let capturedGroups: any;
		const CycleTerm = defineTerm({
			key: 'cycle',
			scope: 'cycle',
			define() { return undefined; },
			[TermHook.ordinal](groups: Record<string, any>, anchor: any) {
				capturedGroups = groups;
				const dayOffset = groups.value ?? parseInt(groups.ord, 10);
				return anchor.add({ days: dayOffset });
			}
		});
		Tempo.use(CycleTerm);

		const anchor = new Tempo('2026-06-30T00:00:00Z');
		const t = Tempo.from('-2nd day of #cycle.2', { anchor });
		expect(t.isValid).toBe(true);
		expect(capturedGroups).toBeDefined();
		expect(capturedGroups.ord).toBe('-2nd');
		expect(capturedGroups.term).toBe('#cycle.2');
		expect(capturedGroups.value).toBe(-2);
		expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-28');
	});

	it('should resolve natural ordinals via [TermHook.ordinal] on standard QuarterTerm (#qtr)', () => {
		const anchor = new Tempo('2026-01-15T00:00:00Z', { sphere: 'north' });

		// 1st day of #qtr.2 -> 2026-04-01
		const t1st = Tempo.from('1st day of #qtr.2', { anchor });
		expect(t1st.isValid).toBe(true);
		expect(t1st.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-01');

		// 3rd day of #qtr.2 -> 2026-04-03
		const t3rd = Tempo.from('3rd day of #qtr.2', { anchor });
		expect(t3rd.isValid).toBe(true);
		expect(t3rd.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-03');

		// last day of #qtr.2 -> 2026-06-30
		const tLast = Tempo.from('last day of #qtr.2', { anchor });
		expect(tLast.isValid).toBe(true);
		expect(tLast.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-30');

		// -2nd day of #qtr.2 -> 2026-06-29
		const tNeg2nd = Tempo.from('-2nd day of #qtr.2', { anchor });
		expect(tNeg2nd.isValid).toBe(true);
		expect(tNeg2nd.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-29');

		// Ordinal on current quarter (anchor in Q1)
		const tCurLast = Tempo.from('last day of #qtr', { anchor });
		expect(tCurLast.isValid).toBe(true);
		expect(tCurLast.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-31');

		// Out of range ordinals throw unresolvable error on evaluation
		expect(() => Tempo.from('200th day of #qtr.2', { anchor }).toDateTime()).toThrow();
		expect(() => Tempo.from('-200th day of #qtr.2', { anchor }).toDateTime()).toThrow();
	});

	it('should resolve natural ordinals via [TermHook.ordinal] on standard SeasonTerm (#szn)', () => {
		const anchor = new Tempo('2026-01-15T00:00:00Z', { sphere: 'north' });

		// 1st day of #szn.summer -> 2026-06-01 (meteorological north summer starts Jun 1)
		const tSummerStart = Tempo.from('1st day of #szn.summer', { anchor });
		expect(tSummerStart.isValid).toBe(true);
		expect(tSummerStart.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-01');

		// last day of #szn.summer -> 2026-08-31
		const tSummerEnd = Tempo.from('last day of #szn.summer', { anchor });
		expect(tSummerEnd.isValid).toBe(true);
		expect(tSummerEnd.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-31');
	});

	it('should resolve natural ordinals via [TermHook.ordinal] on standard ZodiacTerm (#zdc)', () => {
		const anchor = new Tempo('2026-01-15T00:00:00Z');

		// 1st day of #zdc.aries -> 2026-03-21 (Aries: Mar 21 - Apr 19)
		const tAriesStart = Tempo.from('1st day of #zdc.aries', { anchor });
		expect(tAriesStart.isValid).toBe(true);
		expect(tAriesStart.format('{yyyy}-{mm}-{dd}')).toBe('2026-03-21');

		// last day of #zdc.aries -> 2026-04-19 (day before Taurus starts Apr 20)
		const tAriesEnd = Tempo.from('last day of #zdc.aries', { anchor });
		expect(tAriesEnd.isValid).toBe(true);
		expect(tAriesEnd.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-19');
	});

	it('should calculate cycle diffs via [TermHook.diff] on standard QuarterTerm (#qtr)', () => {
		const t1 = new Tempo('2026-02-15T00:00:00Z', { sphere: 'north' });
		const t2 = new Tempo('2026-11-20T00:00:00Z', { sphere: 'north' });

		// Q1 to Q4 = 3 quarters
		expect(t1.until(t2, '#qtr')).toBe(3);
		expect(t2.since(t1, '#qtr')).toBe('-3 #qtr');
		expect(t1.until(t1, '#qtr')).toBe(0);

		// Across calendar years: Q1 2026 to Q2 2027 = 5 quarters
		const t3 = new Tempo('2027-05-10T00:00:00Z', { sphere: 'north' });
		expect(t1.until(t3, '#qtr')).toBe(5);
		expect(t3.since(t1, '#qtr')).toBe('-5 #qtr');
	});

	it('should calculate cycle diffs via [TermHook.diff] on standard SeasonTerm (#szn)', () => {
		const t1 = new Tempo('2026-04-15T00:00:00Z', { sphere: 'north' }); // Spring
		const t2 = new Tempo('2026-10-15T00:00:00Z', { sphere: 'north' }); // Autumn

		// Spring to Autumn = 2 seasons
		expect(t1.until(t2, '#szn')).toBe(2);
		expect(t2.since(t1, '#szn')).toBe('-2 #szn');
		expect(t1.until(t1, '#szn')).toBe(0);
	});

	it('should format tokens with subkeys via [TermHook.format] on standard terms', () => {
		Tempo.use([EasternTerm, TimelineTerm]);

		// QuarterTerm format
		const tQ1 = new Tempo('2026-02-15T00:00:00Z', { sphere: 'north' });
		expect(tQ1.format('Quarter: {#qtr}')).toBe('Quarter: Q1');
		expect(tQ1.format('Label: {#qtr.label}')).toBe('Label: First Quarter');
		expect(tQ1.format('Upper: {#qtr.label:upper}')).toBe('Upper: FIRST QUARTER');

		// SeasonTerm format
		const tSzn = new Tempo('2026-07-15T00:00:00Z', { sphere: 'north' });
		expect(tSzn.format('Season: {#szn}')).toBe('Season: Summer');
		expect(tSzn.format('Symbol: {#szn.symbol}')).toBe('Symbol: Sun');

		// ZodiacTerm format
		const tZdc = new Tempo('2026-04-05T00:00:00Z');
		expect(tZdc.format('Sign: {#zdc}')).toBe('Sign: Aries');
		expect(tZdc.format('Emoji: {#zdc.emoji}')).toBe('Emoji: ♈');
		expect(tZdc.format('Symbol: {#zdc.symbol}')).toBe('Symbol: Ram');

		// EasternTerm format
		const tEast = new Tempo('2024-05-15T00:00:00Z');
		expect(tEast.format('Sign: {#sign}')).toBe('Sign: Dragon');
		expect(tEast.format('Emoji: {#sign.emoji}')).toBe('Emoji: 🐉');
		expect(tEast.format('Element: {#sign.element}')).toBe('Element: Wood');

		// TimelineTerm format
		const tTod = new Tempo('2026-06-15T09:30:00Z');
		expect(tTod.format('Period: {#tod}')).toBe('Period: Morning');
		expect(tTod.format('Hour: {#tod.hour}')).toBe('Hour: 8');
	});

	it('should dispatch [TermHook.step] on add() and sub() dictionary mutations', () => {
		const stepCalls: any[] = [];
		const SteppableTerm = defineTerm({
			key: 'block',
			scope: 'block',
			description: 'Steppable block term',
			define() {
				return undefined;
			},
			[TermHook.step](unit: string, count: number, tempo: any) {
				stepCalls.push({ unit, count });
				// Each block is 14 days
				return tempo.add({ days: count * 14 });
			}
		});

		Tempo.use(SteppableTerm);

		const t = new Tempo('2026-01-01T00:00:00Z');

		// add via dictionary syntax
		const added = t.add({ '#block': 2 });
		expect(added.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-29');

		// subtract via dictionary syntax
		const subbed = added.sub({ '#block': 1 });
		expect(subbed.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-15');

		// add via shorthand string syntax
		const shorthandAdded = t.add('#block.+2');
		expect(shorthandAdded.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-29');

		// add/sub via no-modifier range forms (derives step from caller offset)
		const noModAdded = t.add({ '#block.1': 3 });
		expect(noModAdded.format('{yyyy}-{mm}-{dd}')).toBe('2026-02-12');

		const noModSubbed = t.sub({ '#block.2': 2 });
		expect(noModSubbed.format('{yyyy}-{mm}-{dd}')).toBe('2025-12-04');

		// add/sub via non-directional modifiers (this, >=, <=) derive step from caller offset
		const thisAdded = t.add({ '#block.this': 4 });
		expect(thisAdded.format('{yyyy}-{mm}-{dd}')).toBe('2026-02-26');

		const gteSubbed = t.sub({ '#block.>=': 3 });
		expect(gteSubbed.format('{yyyy}-{mm}-{dd}')).toBe('2025-11-20');

		const lteAdded = t.add({ '#block.<=': 2 });
		expect(lteAdded.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-29');

		expect(stepCalls.length).toBe(8);
		expect(stepCalls[0]).toEqual({ unit: '#block', count: 2 });
		expect(stepCalls[1]).toEqual({ unit: '#block', count: -1 });
		expect(stepCalls[2]).toEqual({ unit: '#block.+2', count: 2 });
		expect(stepCalls[3]).toEqual({ unit: '#block.1', count: 3 });
		expect(stepCalls[4]).toEqual({ unit: '#block.2', count: -2 });
		expect(stepCalls[5]).toEqual({ unit: '#block.this', count: 4 });
		expect(stepCalls[6]).toEqual({ unit: '#block.>=', count: -3 });
		expect(stepCalls[7]).toEqual({ unit: '#block.<=', count: 2 });
	});

	it('should dispatch [TermHook.bound] on set() boundary snapping', () => {
		const boundCalls: any[] = [];
		const BoundTerm = defineTerm({
			key: 'session',
			scope: 'session',
			description: 'Bounded session term',
			define() {
				return undefined;
			},
			[TermHook.bound](boundary: 'start' | 'mid' | 'end', unit: string, tempo: any) {
				boundCalls.push({ boundary, unit });
				if (boundary === 'start') {
					return tempo.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
				}
				if (boundary === 'end') {
					return tempo.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
				}
				if (boundary === 'mid') {
					return tempo.set({ hour: 13, minute: 0, second: 0, millisecond: 0 });
				}
				return undefined;
			}
		});

		Tempo.use(BoundTerm);

		const t = new Tempo('2026-06-15T11:22:33Z');

		// set start via dictionary
		const start = t.set({ '#session': 'start' });
		expect(start.format('{hh}:{mi}:{ss}')).toBe('09:00:00');

		// set end via dictionary
		const end = t.set({ '#session': 'end' });
		expect(end.format('{hh}:{mi}:{ss}')).toBe('17:00:00');

		// set mid via shorthand
		const mid = t.set('#session.mid');
		expect(mid.format('{hh}:{mi}:{ss}')).toBe('13:00:00');

		expect(boundCalls.length).toBe(3);
		expect(boundCalls[0]).toEqual({ boundary: 'start', unit: '#session' });
		expect(boundCalls[1]).toEqual({ boundary: 'end', unit: '#session' });
		expect(boundCalls[2]).toEqual({ boundary: 'mid', unit: '#session.mid' });
	});

	it('should dispatch [TermHook.diff] on until() and since() calculations', () => {
		const diffCalls: any[] = [];
		const DiffTerm = defineTerm({
			key: 'release',
			scope: 'release',
			description: 'Release difference term',
			define() {
				return undefined;
			},
			[TermHook.diff](other: any, unit: string, tempo: any) {
				diffCalls.push({ otherZdt: other.format('{yyyy}-{mm}-{dd}'), unit, tempoZdt: tempo.format('{yyyy}-{mm}-{dd}') });
				// calculate weeks between
				const days = Math.round((other.toDateTime().epochMilliseconds - tempo.toDateTime().epochMilliseconds) / (1000 * 60 * 60 * 24));
				return Math.floor(days / 30);
			}
		});

		Tempo.use(DiffTerm);

		const t1 = new Tempo('2026-01-01T00:00:00Z');
		const t2 = new Tempo('2026-04-01T00:00:00Z');

		const deltaUntil = t1.until(t2, '#release');
		expect(deltaUntil).toBe(3);

		const deltaSince = t2.since(t1, '#release');
		expect(deltaSince).toBe('-3 #release');

		expect(diffCalls.length).toBe(2);
	});

	it('should dispatch [TermHook.format] on custom term tokens in format()', () => {
		const formatCalls: any[] = [];
		const FormatTerm = defineTerm({
			key: 'academic',
			scope: 'academic',
			description: 'Academic term with custom format token',
			define() {
				return undefined;
			},
			[TermHook.format](token: string, tempo: any) {
				formatCalls.push({ token, date: tempo.format('{yyyy}-{mm}') });
				if (token === '#academic') {
					return 'Semester 1';
				}
				if (token === '#academic.code') {
					return 'SEM-1-2026';
				}
				return undefined;
			}
		});

		Tempo.use(FormatTerm);

		const t = new Tempo('2026-02-15T00:00:00Z');

		const str1 = t.format('Current: {#academic}');
		expect(str1).toBe('Current: Semester 1');

		const str2 = t.format('Code: {#academic.code}');
		expect(str2).toBe('Code: SEM-1-2026');

		// With modifier: :upper
		const str3 = t.format('Upper: {#academic:upper}');
		expect(str3).toBe('Upper: SEMESTER 1');

		expect(formatCalls.length).toBe(3);
	});

	it('should support Temporal.ZonedDateTime returns and handle undefined fallback from [TermHook.parse]', () => {
		const FallbackTerm = defineTerm({
			key: 'customdate',
			scope: 'customdate',
			aliases: ['cd'],
			description: 'Custom date parser',
			define() {
				return undefined;
			},
			[TermHook.parse](input: string, context: any) {
				if (input === '#customdate.zdt' || input === '#cd.zdt') {
					return Temporal.ZonedDateTime.from('2026-07-04T12:00:00+00:00[UTC]');
				}
				// return undefined to trigger fallback
				return undefined;
			}
		});

		Tempo.use(FallbackTerm);

		// Returns Temporal.ZonedDateTime directly
		const t1 = new Tempo('#customdate.zdt');
		expect(t1.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-04');

		// Dispatches via alias
		const tAlias = new Tempo('#cd.zdt');
		expect(tAlias.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-04');

		// Returning undefined should safely throw standard Unknown Term error or return invalid
		expect(() => new Tempo('#customdate.unhandled')).toThrow();
	});

	it('should support alternative object syntax for boundary snapping (start/mid/end: "#term")', () => {
		const SnapTerm = defineTerm({
			key: 'sprintbound',
			scope: 'sprintbound',
			description: 'Sprint boundary term',
			define() {
				return undefined;
			},
			[TermHook.bound](boundary: 'start' | 'mid' | 'end', unit: string, tempo: any) {
				if (boundary === 'start') return tempo.set({ day: 1 });
				if (boundary === 'mid') return tempo.set({ day: 15 });
				if (boundary === 'end') return tempo.set({ day: 28 });
				return undefined;
			}
		});

		Tempo.use(SnapTerm);

		const t = new Tempo('2026-02-10T00:00:00Z');

		expect(t.set({ start: '#sprintbound' }).format('{dd}')).toBe('01');
		expect(t.set({ mid: '#sprintbound' }).format('{dd}')).toBe('15');
		expect(t.set({ end: '#sprintbound' }).format('{dd}')).toBe('28');
	});
});

