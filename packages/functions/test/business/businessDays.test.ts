import {
	isBusinessDay,
	nextBusinessDay,
	prevBusinessDay,
	addBusinessDays,
	businessDaysBetween,
} from '../../src/business/businessDays.js';
import { getTemporal } from '../../src/support/temporal.js';
import { Tempo } from '@magmacomputing/tempo';

describe('Phase 2: Business Day & Working Day Math', () => {
	const Temporal = getTemporal();

	describe('isBusinessDay', () => {
		it('identifies weekdays as business days under standard ISO weekend', () => {
			expect(isBusinessDay('2026-10-01')).toBe(true); // Thursday
			expect(isBusinessDay('2026-10-02')).toBe(true); // Friday
			expect(isBusinessDay('2026-10-03')).toBe(false); // Saturday
			expect(isBusinessDay('2026-10-04')).toBe(false); // Sunday
			expect(isBusinessDay('2026-10-05')).toBe(true); // Monday
		});

		it('respects cultural weekend rules via locale option', () => {
			// Saudi Arabia: Friday-Saturday weekend, Sunday is a working day
			expect(isBusinessDay('2026-10-01', { locale: 'ar-SA' })).toBe(true); // Thursday
			expect(isBusinessDay('2026-10-02', { locale: 'ar-SA' })).toBe(false); // Friday
			expect(isBusinessDay('2026-10-03', { locale: 'ar-SA' })).toBe(false); // Saturday
			expect(isBusinessDay('2026-10-04', { locale: 'ar-SA' })).toBe(true); // Sunday
		});

		it('respects custom weekendDays array', () => {
			// Only Sunday is weekend: [7]
			expect(isBusinessDay('2026-10-03', { weekendDays: [7] })).toBe(true); // Saturday is working
			expect(isBusinessDay('2026-10-04', { weekendDays: [7] })).toBe(false); // Sunday
		});

		it('excludes dates in the explicit holidays list', () => {
			const holidays = ['2026-12-25', '2026-12-26'];
			expect(isBusinessDay('2026-12-24', { holidays })).toBe(true); // Thursday
			expect(isBusinessDay('2026-12-25', { holidays })).toBe(false); // Friday (Christmas)
			expect(isBusinessDay('2026-12-26', { holidays })).toBe(false); // Saturday (Boxing Day & Weekend)
		});

		it('supports Date objects and timestamps in holidays list', () => {
			const christmasDate = new Date('2026-12-25T00:00:00Z');
			expect(isBusinessDay('2026-12-25', { holidays: [christmasDate] })).toBe(false);
			expect(isBusinessDay('2026-12-25', { holidays: [christmasDate.getTime()] })).toBe(false);
		});

		it('evaluates dynamic isHoliday predicate', () => {
			const isHoliday = (pd: any) => pd.month === 7 && pd.day === 4; // US Independence Day
			expect(isBusinessDay('2026-07-03', { isHoliday })).toBe(true);
			expect(isBusinessDay('2026-07-04', { isHoliday })).toBe(false);
		});

		it('supports diverse DateInput types (Tempo, Temporal, Date, number)', () => {
			const t = new Tempo('2026-10-02');
			const pd = Temporal.PlainDate.from('2026-10-02');
			const d = new Date('2026-10-02T12:00:00Z');
			const ts = d.getTime();

			expect(isBusinessDay(t)).toBe(true);
			expect(isBusinessDay(pd)).toBe(true);
			expect(isBusinessDay(d)).toBe(true);
			expect(isBusinessDay(ts)).toBe(true);
		});
	});

	describe('nextBusinessDay & prevBusinessDay', () => {
		it('advances past standard weekend from Friday to Monday', () => {
			const next = nextBusinessDay('2026-10-02'); // Friday
			expect(next.dayOfWeek).toBe(1); // Monday
			expect(next.day).toBe(5);
			expect(next.month).toBe(10);
			expect(next.year).toBe(2026);
		});

		it('advances past multi-day holidays and weekends', () => {
			// Thursday -> Friday & Monday are holidays -> Tuesday
			const holidays = ['2026-10-02', '2026-10-05'];
			const next = nextBusinessDay('2026-10-01', { holidays });
			expect(next.day).toBe(6); // Tuesday 2026-10-06
			expect(next.dayOfWeek).toBe(2);
		});

		it('rewinds past standard weekend from Monday to Friday', () => {
			const prev = prevBusinessDay('2026-10-05'); // Monday
			expect(prev.dayOfWeek).toBe(5); // Friday
			expect(prev.day).toBe(2);
			expect(prev.month).toBe(10);
			expect(prev.year).toBe(2026);
		});

		it('rewinds past multi-day holidays and weekends', () => {
			// Tuesday -> Monday & Friday are holidays -> Thursday
			const holidays = ['2026-10-02', '2026-10-05'];
			const prev = prevBusinessDay('2026-10-06', { holidays });
			expect(prev.day).toBe(1); // Thursday 2026-10-01
			expect(prev.dayOfWeek).toBe(4);
		});
	});

	describe('addBusinessDays', () => {
		it('performs standard T+2 settlement addition crossing weekends', () => {
			// Thursday + 2 business days -> Monday
			const result = addBusinessDays('2026-10-01', 2);
			expect(result.year).toBe(2026);
			expect(result.month).toBe(10);
			expect(result.day).toBe(5); // Monday
			expect(result.dayOfWeek).toBe(1);
		});

		it('performs standard T+2 settlement addition within the same week', () => {
			// Tuesday + 2 business days -> Thursday
			const result = addBusinessDays('2026-10-06', 2);
			expect(result.day).toBe(8); // Thursday
			expect(result.dayOfWeek).toBe(4);
		});

		it('accounts for public holidays during addition', () => {
			// Wednesday + 2 business days, but Thursday is holiday -> Friday + Monday
			const holidays = ['2026-10-08'];
			const result = addBusinessDays('2026-10-07', 2, { holidays });
			expect(result.day).toBe(12); // Monday 2026-10-12
		});

		it('handles negative business day subtraction', () => {
			// Monday - 2 business days -> Thursday
			const result = addBusinessDays('2026-10-05', -2);
			expect(result.day).toBe(1); // Thursday 2026-10-01
			expect(result.dayOfWeek).toBe(4);
		});

		it('returns unchanged date when amount is 0', () => {
			const result = addBusinessDays('2026-10-02', 0);
			expect(result.day).toBe(2);
			expect(result.month).toBe(10);
		});
	});

	describe('businessDaysBetween', () => {
		it('returns 0 when start and end are on the same day', () => {
			expect(businessDaysBetween('2026-10-02', '2026-10-02')).toBe(0);
		});

		it('calculates business days between Friday and Monday as 1', () => {
			expect(businessDaysBetween('2026-10-02', '2026-10-05')).toBe(1);
		});

		it('calculates full working week (Monday to Friday) as 4 working days', () => {
			expect(businessDaysBetween('2026-10-05', '2026-10-09')).toBe(4);
		});

		it('returns negative business days when start is after end', () => {
			expect(businessDaysBetween('2026-10-05', '2026-10-02')).toBe(-1);
			expect(businessDaysBetween('2026-10-09', '2026-10-05')).toBe(-4);
		});

		it('excludes holidays from the business day count', () => {
			// Monday to Friday (normally 4 days between), with Wednesday as holiday -> 3
			const holidays = ['2026-10-07'];
			expect(businessDaysBetween('2026-10-05', '2026-10-09', { holidays })).toBe(3);
		});

		it('spans month and year boundaries accurately', () => {
			// 2026-12-30 (Wed) to 2027-01-05 (Tue)
			// Days: Dec 31 (Thu, 1), Jan 1 (Fri, 2), Jan 2 (Sat, weekend), Jan 3 (Sun, weekend), Jan 4 (Mon, 3), Jan 5 (Tue, 4)
			expect(businessDaysBetween('2026-12-30', '2027-01-05')).toBe(4);

			// With Jan 1 as New Year's Day holiday -> 3
			const holidays = ['2027-01-01'];
			expect(businessDaysBetween('2026-12-30', '2027-01-05', { holidays })).toBe(3);
		});
	});
});
