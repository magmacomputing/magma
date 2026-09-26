import { formatDate, getIsoDayOfWeek, getNthWeekdayOfMonth, offsetDate } from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

function getUsObservedDate(year: number, month: number, day: number): string | null {
	const dow = getIsoDayOfWeek(year, month, day);
	if (dow === 6) {
		// Saturday -> Friday before
		return offsetDate(year, month, day, -1);
	}
	if (dow === 7) {
		// Sunday -> Monday after
		return offsetDate(year, month, day, 1);
	}
	return null;
}

export const generateUsHolidays: HolidayCalendarGenerator = (year: number, region?: string, includeObserved = true): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'US';
	const reg = region ? region.toUpperCase().replace(/^US-/, '') : undefined;

	const addHoliday = (date: string, name: string, isObserved = false, holidayRegion?: string) => {
		holidays.push({ date, name, country, region: holidayRegion, isObserved });
	};

	const addFixedWithObservation = (month: number, day: number, name: string, holidayRegion?: string) => {
		const baseDate = formatDate(year, month, day);
		addHoliday(baseDate, name, false, holidayRegion);

		if (includeObserved) {
			const observed = getUsObservedDate(year, month, day);
			if (observed)
				addHoliday(observed, `${name} (Observed)`, true, holidayRegion);
		}
	};

	// 1. New Year's Day (Jan 1)
	addFixedWithObservation(1, 1, "New Year's Day");

	// 2. Martin Luther King Jr. Day (3rd Monday in January)
	addHoliday(getNthWeekdayOfMonth(year, 1, 1, 3), 'Martin Luther King Jr. Day');

	// 3. Washington's Birthday / Presidents' Day (3rd Monday in February)
	addHoliday(getNthWeekdayOfMonth(year, 2, 1, 3), "Washington's Birthday");

	// 4. Memorial Day (Last Monday in May)
	addHoliday(getNthWeekdayOfMonth(year, 5, 1, -1), 'Memorial Day');

	// 5. Juneteenth National Independence Day (June 19)
	if (year >= 2021)
		addFixedWithObservation(6, 19, 'Juneteenth National Independence Day');

	// 6. Independence Day (July 4)
	addFixedWithObservation(7, 4, 'Independence Day');

	// 7. Labor Day (1st Monday in September)
	addHoliday(getNthWeekdayOfMonth(year, 9, 1, 1), 'Labor Day');

	// 8. Columbus Day / Indigenous Peoples' Day (2nd Monday in October)
	addHoliday(getNthWeekdayOfMonth(year, 10, 1, 2), 'Columbus Day');

	// 9. Veterans Day (November 11)
	addFixedWithObservation(11, 11, 'Veterans Day');

	// 10. Thanksgiving Day (4th Thursday in November)
	const thanksgiving = getNthWeekdayOfMonth(year, 11, 4, 4);
	addHoliday(thanksgiving, 'Thanksgiving Day');

	// 11. Day After Thanksgiving (Black Friday - celebrated in many states)
	const tgParts = thanksgiving.split('-').map(Number);
	const dayAfterThanksgiving = offsetDate(tgParts[0]!, tgParts[1]!, tgParts[2]!, 1);
	if (reg && ['CA', 'DE', 'FL', 'IA', 'IL', 'KS', 'KY', 'ME', 'MI', 'MN', 'NE', 'NV', 'NH', 'NC', 'OK', 'PA', 'SC', 'TN', 'TX', 'VA', 'WV'].includes(reg))
		addHoliday(dayAfterThanksgiving, 'Day After Thanksgiving', false, reg);

	// 12. Christmas Day (December 25)
	addFixedWithObservation(12, 25, 'Christmas Day');

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
