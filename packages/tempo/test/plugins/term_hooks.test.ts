import { Tempo, TermHook } from '#tempo';
import { defineTerm } from '#tempo/plugin/term/term.util.js';
import { QuarterTerm } from '#tempo/std';

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
				const ordMap: Record<string, number> = {
					first: 1, second: 2, third: 3, fourth: 4, fifth: 5, last: 14
				};
				const dayOffset = parseInt(groups.ord, 10) || ordMap[groups.ord?.toLowerCase()];
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

		expect(stepCalls.length).toBe(5);
		expect(stepCalls[0]).toEqual({ unit: '#block', count: 2 });
		expect(stepCalls[1]).toEqual({ unit: '#block', count: -1 });
		expect(stepCalls[2]).toEqual({ unit: '#block.+2', count: 2 });
		expect(stepCalls[3]).toEqual({ unit: '#block.1', count: 3 });
		expect(stepCalls[4]).toEqual({ unit: '#block.2', count: -2 });
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

	it('should maintain zero-regression on existing terms without hooks (QuarterTerm)', () => {
		Tempo.use(QuarterTerm);

		const t = new Tempo('2024-05-15T12:00:00', { timeZone: 'America/New_York' });

		// Standard range mutations remain functional
		const tStart = t.set({ start: '#quarter' });
		expect(tStart.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');

		const tIndex = t.set({ '#quarter': 4 });
		expect(tIndex.format('{yyyy}-{mm}')).toBe('2024-10');
	});
});

