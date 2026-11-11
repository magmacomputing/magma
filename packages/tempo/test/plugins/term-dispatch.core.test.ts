import { Tempo } from '#tempo/core';
import { ParseEngine } from '#tempo/parse';
import '#tempo/mutate';
import '#tempo/format';
import { defineTerm, defineSpan, getTermRange } from '#tempo/term';
import { QuarterTerm } from '#tempo/terms';

describe('Term Dispatch Refactor', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(QuarterTerm);
	});

	it('should set term by index (#quarter: 2)', () => {
		const t = new Tempo('2024-01-01T00:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ '#quarter': 2 });
		// Q2 2024 (North) should start on April 1st
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should set start of current term (start: "#quarter")', () => {
		const t = new Tempo('2024-05-15T12:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ 'start': '#quarter' });
		// May 15 is in Q2, so start should be April 1st
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
		expect(t2.format('{hh}:{mi}:{ss}')).toBe('00:00:00');
	});

	it('should stay within fiscal year when setting by index', () => {
		const t = new Tempo('2024-01-01T00:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ '#quarter': 4 });
		expect(t2.format('{yyyy}')).toBe('2024');
		expect(t2.format('{mm}')).toBe('10');
	});

	it('should throw error for unknown term', () => {
		const t = new Tempo();
		expect(() => t.set({ '#unknown': 1 })).toThrow('Unknown Term identifier: #unknown');
	});

	it('should handle mid.term correctly', () => {
		const t = new Tempo('2024-01-01T00:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ 'mid': '#quarter' });
		// Q1 is Jan, Feb, Mar. Mid should be midpoint of range.
		// Approx Feb 15
		expect(t2.format('{yyyy}-{mm}')).toBe('2024-02');
	});

	it('should preserve resolved range start when ParseEngine parses a bare term name', () => {
		const anchor = new Tempo('2024-05-15T12:00:00Z');
		const parsed = ParseEngine.parse('#quarter', anchor.toDateTime(), '#quarter') as Temporal.ZonedDateTime;
		expect(parsed.toPlainDate().toString({ calendarName: 'never' })).toBe('2024-04-01');
	});

	it('should preserve anchor time zone when ParseEngine parses a bare term with differing configured time zone', () => {
		const anchor = new Tempo('2024-05-15T12:00:00Z'); // UTC
		const parsed = ParseEngine.parse('#quarter', anchor.toDateTime(), '#quarter') as Temporal.ZonedDateTime;
		expect(parsed.timeZoneId).toBe('UTC');
		expect(parsed.toPlainDate().toString({ calendarName: 'never' })).toBe('2024-04-01');
	});

	it('should advance across empty match windows using currentRes.span forward and backward', () => {
		Tempo.use(defineTerm({
			key: 'win',
			scope: 'windowTerm',
			resolve(anchor: any) {
				const y = anchor?.year ?? this.yy;
				return [
					{ key: 'WinA', year: y, month: 1, day: 1 },
					{ key: 'WinB', year: y, month: 7, day: 1 },
				];
			},
			define() {
				return undefined;
			},
		}));

		// Forward empty-matches jump (2024-08-01 is in WinB -> jumps via currentRes.span.end to 2025-07-01)
		const tLate = new Tempo('2024-08-01T12:00:00Z');
		expect(tLate.set({ start: '#win.>WinB' }).format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');

		// Backward empty-matches jump (2024-02-15 is in WinA -> jumps via currentRes.span.start - 1ns into 2023)
		const tEarly = new Tempo('2024-02-15T12:00:00Z');
		expect(tEarly.set({ start: '#win.<WinA' }).format('{yyyy}-{mm}-{dd}')).toBe('2023-01-01');
	});

	it('should preserve declared span boundaries when a range supplies span instead of date fields', () => {
		const t = new Tempo('2024-06-15T12:00:00Z');
		const start = new Tempo('2024-06-01T00:00:00Z');
		const end = new Tempo('2024-07-01T00:00:00Z');

		const spanOnlyRange = {
			key: 'CustomSpan',
			span: defineSpan(t, start, end, t)
		};

		const resolved = getTermRange(t, [spanOnlyRange], false) as any;
		expect(resolved).toBeDefined();
		expect(resolved.key).toBe('CustomSpan');
		expect(resolved.span.start.epoch.ns).toBe(start.epoch.ns);
		expect(resolved.span.end.epoch.ns).toBe(end.epoch.ns);

		// Numeric selection should select the single span-backed range for key 1
		const selected1 = getTermRange(t, [spanOnlyRange], 1) as any;
		expect(selected1).toBeDefined();
		expect(selected1.key).toBe('CustomSpan');
		expect(selected1.span.start.epoch.ns).toBe(start.epoch.ns);

		// Numeric selection should reject out-of-range or non-integer indices
		expect(getTermRange(t, [spanOnlyRange], 2)).toBeUndefined();
		expect(getTermRange(t, [spanOnlyRange], 0)).toBeUndefined();
		expect(getTermRange(t, [spanOnlyRange], 1.5)).toBeUndefined();
	});

	it('should preserve all ranges for same-year repeated key sequences without cycle truncation', () => {
		const t = new Tempo('2024-05-15T12:00:00Z');
		const ranges = [
			{ key: 'A', year: 2024, month: 1, day: 1 },
			{ key: 'B', year: 2024, month: 3, day: 1 },
			{ key: 'A', year: 2024, month: 5, day: 1 },
			{ key: 'B', year: 2024, month: 7, day: 1 },
			{ key: 'A', year: 2024, month: 9, day: 1 },
			{ key: 'B', year: 2024, month: 11, day: 1 },
		];
		const r3 = getTermRange(t, ranges, 3) as any;
		expect(r3).toBeDefined();
		expect(r3.key).toBe('A');
		expect(r3.span.start.mm).toBe(5);

		const r6 = getTermRange(t, ranges, 6) as any;
		expect(r6).toBeDefined();
		expect(r6.key).toBe('B');
		expect(r6.span.start.mm).toBe(11);
	});

	it('should sort mixed span-backed and schema-based ranges by resolved chronological start', () => {
		const t = new Tempo('2024-06-15T12:00:00Z');
		const rEarlier = {
			key: 'EarlierSchema',
			year: 2024,
			month: 3,
			day: 1
		};
		const rLater = {
			key: 'LaterSpan',
			span: defineSpan(t, new Tempo('2024-05-01T00:00:00Z'), new Tempo('2024-07-01T00:00:00Z'), t)
		};

		// Passed in reverse order: LaterSpan then EarlierSchema
		const match = getTermRange(t, [rLater, rEarlier], true) as string;
		expect(match).toBe('LaterSpan');

		const tEarly = new Tempo('2024-03-15T12:00:00Z');
		const matchEarly = getTermRange(tEarly, [rLater, rEarlier], true) as string;
		expect(matchEarly).toBe('EarlierSchema');
	});

	it('should resolve absolute mutation from span.start when range has no calendar fields', () => {
		Tempo.use(defineTerm({
			key: 'customTerm',
			scope: 'customScope',
			resolve(anchor: any) {
				const start = new Tempo('2024-06-01T00:00:00Z');
				const end = new Tempo('2024-07-01T00:00:00Z');
				return [{
					key: 'JuneRange',
					span: defineSpan(start, start, end, start)
				}];
			},
			define() {
				return undefined;
			}
		}));

		const tMid = new Tempo('2024-06-15T12:00:00Z');
		const snapped = tMid.set({ start: '#customTerm' });
		expect(snapped.format('{yyyy}-{mm}-{dd}')).toBe('2024-06-01');

		const snappedEnd = tMid.set({ end: '#customTerm' });
		expect(snappedEnd.format('{yyyy}-{mm}-{dd}')).toBe('2024-06-30');
		expect(snappedEnd.hh).toBe(23);
		expect(snappedEnd.mi).toBe(59);
		expect(snappedEnd.ss).toBe(59);
	});
});
