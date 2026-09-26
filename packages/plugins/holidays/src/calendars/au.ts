import {
	formatDate,
	getIsoDayOfWeek,
	getNthWeekdayOfMonth,
	getGoodFriday,
	getEasterSaturday,
	getEasterSunday,
	getEasterMonday,
	offsetDate,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

export const generateAuHolidays: HolidayCalendarGenerator = (year: number, region?: string, includeObserved = true): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'AU';
	const reg = region ? region.toUpperCase().replace(/^AU-/, '') : undefined;

	const addHoliday = (date: string, name: string, isObserved = false, holidayRegion?: string) => {
		if (!holidayRegion || !reg || holidayRegion === reg) {
			holidays.push({ date, name, country, region: holidayRegion, isObserved });
		}
	};

	// 1. New Year's Day (Jan 1, observed on Monday if weekend)
	const nyDow = getIsoDayOfWeek(year, 1, 1);
	addHoliday(formatDate(year, 1, 1), "New Year's Day");
	if (includeObserved) {
		if (nyDow === 6) addHoliday(formatDate(year, 1, 3), "New Year's Day (Observed)", true);
		if (nyDow === 7) addHoliday(formatDate(year, 1, 2), "New Year's Day (Observed)", true);
	}

	// 2. Australia Day (Jan 26, observed on Monday if weekend)
	const adDow = getIsoDayOfWeek(year, 1, 26);
	addHoliday(formatDate(year, 1, 26), 'Australia Day');
	if (includeObserved) {
		if (adDow === 6) addHoliday(formatDate(year, 1, 28), 'Australia Day (Observed)', true);
		if (adDow === 7) addHoliday(formatDate(year, 1, 27), 'Australia Day (Observed)', true);
	}

	// 3. Easter
	addHoliday(getGoodFriday(year), 'Good Friday');
	addHoliday(getEasterSaturday(year), 'Easter Saturday');
	addHoliday(getEasterSunday(year).dateStr, 'Easter Sunday');
	addHoliday(getEasterMonday(year), 'Easter Monday');

	// 4. ANZAC Day (April 25)
	addHoliday(formatDate(year, 4, 25), 'ANZAC Day');
	if (includeObserved && ['WA', 'ACT', 'NT'].includes(reg ?? '')) {
		const anzacDow = getIsoDayOfWeek(year, 4, 25);
		if (anzacDow === 7) addHoliday(formatDate(year, 4, 26), 'ANZAC Day (Observed)', true, reg);
		if (anzacDow === 6 && reg === 'WA') addHoliday(formatDate(year, 4, 27), 'ANZAC Day (Observed)', true, 'WA');
	}

	// 5. King's Birthday
	if (reg === 'WA') {
		// WA King's Birthday: usually last Monday in September
		addHoliday(getNthWeekdayOfMonth(year, 9, 1, -1), "King's Birthday", false, 'WA');
	} else if (reg === 'QLD') {
		// QLD King's Birthday: 1st Monday in October
		addHoliday(getNthWeekdayOfMonth(year, 10, 1, 1), "King's Birthday", false, 'QLD');
	} else {
		// National / NSW / VIC / ACT / SA / TAS / NT: 2nd Monday in June
		addHoliday(getNthWeekdayOfMonth(year, 6, 1, 2), "King's Birthday");
	}

	// 6. Labour Day / Eight Hours Day / May Day
	if (reg === 'WA') {
		addHoliday(getNthWeekdayOfMonth(year, 3, 1, 1), 'Labour Day', false, 'WA');
	} else if (reg === 'VIC') {
		addHoliday(getNthWeekdayOfMonth(year, 3, 1, 2), 'Labour Day', false, 'VIC');
	} else if (reg === 'TAS') {
		addHoliday(getNthWeekdayOfMonth(year, 3, 1, 2), 'Eight Hours Day', false, 'TAS');
	} else if (reg === 'QLD') {
		addHoliday(getNthWeekdayOfMonth(year, 5, 1, 1), 'Labour Day', false, 'QLD');
	} else if (reg === 'NT') {
		addHoliday(getNthWeekdayOfMonth(year, 5, 1, 1), 'May Day', false, 'NT');
	} else if (reg === 'ACT' || reg === 'NSW' || reg === 'SA' || !reg) {
		addHoliday(getNthWeekdayOfMonth(year, 10, 1, 1), 'Labour Day', false, reg);
	}

	// 7. Melbourne Cup (VIC: 1st Tuesday in November)
	if (reg === 'VIC')
		addHoliday(getNthWeekdayOfMonth(year, 11, 2, 1), 'Melbourne Cup Day', false, 'VIC');

	// 8. Christmas Day & Boxing Day (with dual shift observation)
	const cDow = getIsoDayOfWeek(year, 12, 25);
	addHoliday(formatDate(year, 12, 25), 'Christmas Day');
	const boxingName = reg === 'SA' ? 'Proclamation Day' : 'Boxing Day';
	addHoliday(formatDate(year, 12, 26), boxingName);

	if (includeObserved) {
		if (cDow === 6) {
			// Saturday Christmas -> Monday 27 Dec & Tuesday 28 Dec
			addHoliday(formatDate(year, 12, 27), 'Christmas Day (Observed)', true);
			addHoliday(formatDate(year, 12, 28), `${boxingName} (Observed)`, true);
		} else if (cDow === 7) {
			// Sunday Christmas -> Monday 27 Dec & Tuesday 28 Dec
			addHoliday(formatDate(year, 12, 27), 'Christmas Day (Observed)', true);
			addHoliday(formatDate(year, 12, 28), `${boxingName} (Observed)`, true);
		} else if (cDow === 5) {
			// Friday Christmas -> Boxing Day Saturday -> Monday 28 Dec
			addHoliday(formatDate(year, 12, 28), `${boxingName} (Observed)`, true);
		}
	}

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
