import { Tempo } from '#tempo/core';
import { ParseEngine } from '#tempo/parse';
import '#tempo/mutate';
import '#tempo/format';
import { defineTerm } from '#tempo/term';
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
});
