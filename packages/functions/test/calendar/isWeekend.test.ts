import { isWeekend, isWeekday } from '../../src/calendar/calendar.js';
import { Tempo } from '@magmacomputing/tempo';

describe('isWeekend and isWeekday', () => {
	// 2026-10-01 is Thursday (ISO 4)
	// 2026-10-02 is Friday (ISO 5)
	// 2026-10-03 is Saturday (ISO 6)
	// 2026-10-04 is Sunday (ISO 7)
	// 2026-10-05 is Monday (ISO 1)

	it('should accurately identify ISO Saturday and Sunday as weekend', () => {
		expect(isWeekend('2026-10-03')).toBe(true); // Saturday
		expect(isWeekend('2026-10-04')).toBe(true); // Sunday

		expect(isWeekday('2026-10-03')).toBe(false);
		expect(isWeekday('2026-10-04')).toBe(false);
	});

	it('should accurately identify ISO Monday through Friday as weekdays', () => {
		expect(isWeekend('2026-10-01')).toBe(false); // Thursday
		expect(isWeekend('2026-10-02')).toBe(false); // Friday
		expect(isWeekend('2026-10-05')).toBe(false); // Monday

		expect(isWeekday('2026-10-01')).toBe(true);
		expect(isWeekday('2026-10-02')).toBe(true);
		expect(isWeekday('2026-10-05')).toBe(true);
	});

	it('should work with Tempo instances', () => {
		const sat = new Tempo('2026-10-03');
		const mon = new Tempo('2026-10-05');

		expect(isWeekend(sat)).toBe(true);
		expect(isWeekday(sat)).toBe(false);

		expect(isWeekend(mon)).toBe(false);
		expect(isWeekday(mon)).toBe(true);
	});

	it('should work with standard Date objects and duck-typed objects', () => {
		const sat = new Date(2026, 9, 3); // Saturday, Oct 3, 2026
		expect(isWeekend(sat)).toBe(true);

		expect(isWeekend({ dayOfWeek: 6 })).toBe(true);
		expect(isWeekend({ dayOfWeek: 1 })).toBe(false);
	});

	it('should support custom weekendDays override', () => {
		// Custom Friday-only weekend [5]
		expect(isWeekend('2026-10-02', { weekendDays: [5] })).toBe(true); // Friday
		expect(isWeekend('2026-10-03', { weekendDays: [5] })).toBe(false); // Saturday
		expect(isWeekday('2026-10-03', { weekendDays: [5] })).toBe(true);

		// Custom Friday-Saturday weekend [5, 6]
		expect(isWeekend('2026-10-02', { weekendDays: [5, 6] })).toBe(true); // Friday
		expect(isWeekend('2026-10-03', { weekendDays: [5, 6] })).toBe(true); // Saturday
		expect(isWeekend('2026-10-04', { weekendDays: [5, 6] })).toBe(false); // Sunday
		expect(isWeekday('2026-10-04', { weekendDays: [5, 6] })).toBe(true);
	});

	it('should adapt to cultural locale conventions (e.g. ar-SA, ar-EG for Friday-Saturday weekend)', () => {
		expect(isWeekend('2026-10-02', { locale: 'ar-SA' })).toBe(true); // Friday in SA is weekend
		expect(isWeekend('2026-10-03', { locale: 'ar-SA' })).toBe(true); // Saturday in SA is weekend
		expect(isWeekend('2026-10-04', { locale: 'ar-SA' })).toBe(false); // Sunday in SA is weekday

		expect(isWeekday('2026-10-04', { locale: 'ar-SA' })).toBe(true); // Sunday is working day
	});
});
