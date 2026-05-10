import { Tempo } from '#tempo/core';
import '#tempo/parse';
import '#tempo/format';

describe('24:00 Hour Overflow', () => {
	beforeEach(() => {
		Tempo.init();
	});

	it('should handle "24:00" as the beginning of the next day', () => {
		const t = new Tempo('2024-05-20 24:00');
		// 2024-05-20 24:00 -> 2024-05-21 00:00
		expect(t.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2024-05-21 00:00');
	});

	it('should handle "24:00" shorthand as beginning of tomorrow', () => {
		const t = new Tempo('24:00');
		const tomorrow = Temporal.Now.zonedDateTimeISO().add({ days: 1 }).with({ hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
		
		// We use toDateTime() to get the ZonedDateTime and compare
		const dt = t.toDateTime();
		expect(dt.year).toBe(tomorrow.year);
		expect(dt.month).toBe(tomorrow.month);
		expect(dt.day).toBe(tomorrow.day);
		expect(dt.hour).toBe(0);
		expect(dt.minute).toBe(0);
	});

	it('should handle "nye 24:00" as 01-Jan of the next year', () => {
		// nye = 31 Dec
		// 31 Dec 24:00 -> 01 Jan (next year)
		const t = new Tempo('2024-12-31 24:00');
		expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2025-01-01');
		
		// Now test the alias "nye"
		// If we use "nye 24:00" without a year, it uses the current year
		const currentYear = Temporal.Now.zonedDateTimeISO().year;
		const tAlias = new Tempo('nye 24:00');
		expect(tAlias.format('{yyyy}-{mm}-{dd}')).toBe(`${currentYear + 1}-01-01`);
	});

	it('should handle "midnight" alias which resolves to 24:00', () => {
		const t = new Tempo('2024-05-20 midnight');
		expect(t.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2024-05-21 00:00');
	});
});
