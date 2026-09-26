import {
	formatDate,
	getIsoDayOfWeek,
	getNthWeekdayOfMonth,
	getGoodFriday,
	getEasterMonday,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

const MATARIKI_DATES: Record<number, string> = {
	2022: '2022-06-24',
	2023: '2023-07-14',
	2024: '2024-06-28',
	2025: '2025-06-20',
	2026: '2026-07-10',
	2027: '2027-06-25',
	2028: '2028-07-14',
	2029: '2029-07-06',
	2030: '2030-06-21',
	2031: '2031-07-11',
	2032: '2032-07-02',
	2033: '2033-06-24',
	2034: '2034-07-07',
	2035: '2035-06-29',
};

export const generateNzHolidays: HolidayCalendarGenerator = (year: number, region?: string, includeObserved = true): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'NZ';
	const reg = region ? region.toUpperCase().replace(/^NZ-/, '') : undefined;

	const addHoliday = (date: string, name: string, isObserved = false, holidayRegion?: string) => {
		if (!holidayRegion || !reg || holidayRegion === reg)
			holidays.push({ date, name, country, region: holidayRegion, isObserved });
	};

	// 1. New Year's Day & Day after
	const nyDow = getIsoDayOfWeek(year, 1, 1);
	addHoliday(formatDate(year, 1, 1), "New Year's Day");
	addHoliday(formatDate(year, 1, 2), "Day after New Year's Day");

	if (includeObserved) {
		if (nyDow === 6) {
			addHoliday(formatDate(year, 1, 3), "New Year's Day (Observed)", true);
			addHoliday(formatDate(year, 1, 4), "Day after New Year's Day (Observed)", true);
		} else if (nyDow === 7) {
			addHoliday(formatDate(year, 1, 3), "New Year's Day (Observed)", true);
		} else if (nyDow === 5) {
			addHoliday(formatDate(year, 1, 4), "Day after New Year's Day (Observed)", true);
		}
	}

	// 2. Waitangi Day (Feb 6 - Mondayised)
	const wDow = getIsoDayOfWeek(year, 2, 6);
	addHoliday(formatDate(year, 2, 6), 'Waitangi Day');
	if (includeObserved) {
		if (wDow === 6) addHoliday(formatDate(year, 2, 8), 'Waitangi Day (Observed)', true);
		if (wDow === 7) addHoliday(formatDate(year, 2, 7), 'Waitangi Day (Observed)', true);
	}

	// 3. Good Friday & Easter Monday
	addHoliday(getGoodFriday(year), 'Good Friday');
	addHoliday(getEasterMonday(year), 'Easter Monday');

	// 4. ANZAC Day (April 25 - Mondayised)
	const anzacDow = getIsoDayOfWeek(year, 4, 25);
	addHoliday(formatDate(year, 4, 25), 'ANZAC Day');
	if (includeObserved) {
		if (anzacDow === 6) addHoliday(formatDate(year, 4, 27), 'ANZAC Day (Observed)', true);
		if (anzacDow === 7) addHoliday(formatDate(year, 4, 26), 'ANZAC Day (Observed)', true);
	}

	// 5. King's Birthday (1st Monday in June)
	addHoliday(getNthWeekdayOfMonth(year, 6, 1, 1), "King's Birthday");

	// 6. Matariki (Te Kāhui o Matariki)
	if (MATARIKI_DATES[year]) {
		addHoliday(MATARIKI_DATES[year]!, 'Matariki');
	}

	// 7. Labour Day (4th Monday in October)
	addHoliday(getNthWeekdayOfMonth(year, 10, 1, 4), 'Labour Day');

	// 8. Christmas Day & Boxing Day (Mondayised)
	const cDow = getIsoDayOfWeek(year, 12, 25);
	addHoliday(formatDate(year, 12, 25), 'Christmas Day');
	addHoliday(formatDate(year, 12, 26), 'Boxing Day');

	if (includeObserved) {
		if (cDow === 6) {
			addHoliday(formatDate(year, 12, 27), 'Christmas Day (Observed)', true);
			addHoliday(formatDate(year, 12, 28), 'Boxing Day (Observed)', true);
		} else if (cDow === 7) {
			addHoliday(formatDate(year, 12, 27), 'Christmas Day (Observed)', true);
		} else if (cDow === 5) {
			addHoliday(formatDate(year, 12, 28), 'Boxing Day (Observed)', true);
		}
	}

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
