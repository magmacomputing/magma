import {
	formatDate,
	getIsoDayOfWeek,
	getNthWeekdayOfMonth,
	getGoodFriday,
	getEasterMonday,
	offsetDate,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

export const generateCaHolidays: HolidayCalendarGenerator = (year: number, region?: string, includeObserved = true): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'CA';
	const reg = region ? region.toUpperCase().replace(/^CA-/, '') : undefined;

	const addHoliday = (date: string, name: string, isObserved = false, holidayRegion?: string) => {
		if (!holidayRegion || !reg || holidayRegion === reg) {
			holidays.push({ date, name, country, region: holidayRegion, isObserved });
		}
	};

	// 1. New Year's Day (Jan 1)
	const nyDow = getIsoDayOfWeek(year, 1, 1);
	addHoliday(formatDate(year, 1, 1), "New Year's Day");
	if (includeObserved) {
		if (nyDow === 6) addHoliday(formatDate(year, 1, 3), "New Year's Day (Observed)", true);
		if (nyDow === 7) addHoliday(formatDate(year, 1, 2), "New Year's Day (Observed)", true);
	}

	// 2. Family Day / Heritage Day / Louis Riel Day (3rd Monday in February)
	const familyDay = getNthWeekdayOfMonth(year, 2, 1, 3);
	if (reg === 'MB') addHoliday(familyDay, 'Louis Riel Day', false, 'MB');
	else if (reg === 'PE') addHoliday(familyDay, 'Islander Day', false, 'PE');
	else if (reg === 'NS') addHoliday(familyDay, 'Heritage Day', false, 'NS');
	else addHoliday(familyDay, 'Family Day', false, reg);

	// 3. Good Friday & Easter Monday
	addHoliday(getGoodFriday(year), 'Good Friday');
	if (reg === 'QC' || !reg) {
		addHoliday(getEasterMonday(year), 'Easter Monday', false, reg);
	}

	// 4. Victoria Day (Monday preceding May 25)
	// Find day of week for May 24
	const may24Dow = getIsoDayOfWeek(year, 5, 24);
	const victoriaDayOffset = (may24Dow === 1) ? 0 : -(may24Dow - 1);
	const victoriaDay = offsetDate(year, 5, 24, victoriaDayOffset);
	const vicName = reg === 'QC' ? 'National Patriots’ Day' : 'Victoria Day';
	addHoliday(victoriaDay, vicName, false, reg);

	// 5. Canada Day (July 1)
	const cdDow = getIsoDayOfWeek(year, 7, 1);
	addHoliday(formatDate(year, 7, 1), 'Canada Day');
	if (includeObserved && cdDow === 7)
		addHoliday(formatDate(year, 7, 2), 'Canada Day (Observed)', true);

	// 6. Civic Holiday (1st Monday in August)
	addHoliday(getNthWeekdayOfMonth(year, 8, 1, 1), 'Civic Holiday', false, reg);

	// 7. Labour Day (1st Monday in September)
	addHoliday(getNthWeekdayOfMonth(year, 9, 1, 1), 'Labour Day');

	// 8. National Day for Truth and Reconciliation (September 30, since 2021)
	if (year >= 2021)
		addHoliday(formatDate(year, 9, 30), 'National Day for Truth and Reconciliation');

	// 9. Thanksgiving (2nd Monday in October)
	addHoliday(getNthWeekdayOfMonth(year, 10, 1, 2), 'Thanksgiving');

	// 10. Remembrance Day (November 11)
	addHoliday(formatDate(year, 11, 11), 'Remembrance Day');

	// 11. Christmas Day & Boxing Day
	addHoliday(formatDate(year, 12, 25), 'Christmas Day');
	addHoliday(formatDate(year, 12, 26), 'Boxing Day');

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
