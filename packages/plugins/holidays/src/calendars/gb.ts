import {
	formatDate,
	getIsoDayOfWeek,
	getNthWeekdayOfMonth,
	getGoodFriday,
	getEasterMonday,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

export const generateGbHolidays: HolidayCalendarGenerator = (year: number, region?: string, includeObserved = true): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'GB';
	const reg = region ? region.toUpperCase().replace(/^GB-/, '') : undefined;
	const isScotland = reg === 'SCT' || reg === 'SCOTLAND';
	const isNorthernIreland = reg === 'NIR' || reg === 'NORTHERN-IRELAND';

	const addHoliday = (date: string, name: string, isObserved = false, holidayRegion?: string) => {
		holidays.push({ date, name, country, region: holidayRegion, isObserved });
	};

	// 1. New Year's Day (Jan 1)
	const nyDow = getIsoDayOfWeek(year, 1, 1);
	addHoliday(formatDate(year, 1, 1), "New Year's Day");
	if (includeObserved) {
		if (nyDow === 6) addHoliday(formatDate(year, 1, 3), "New Year's Day (Observed)", true);
		if (nyDow === 7) addHoliday(formatDate(year, 1, 2), "New Year's Day (Observed)", true);
	}

	// 2. 2nd January (Scotland)
	if (isScotland)
		addHoliday(formatDate(year, 1, 2), '2nd January', false, 'SCT');

	// 3. St Patrick's Day (Northern Ireland)
	if (isNorthernIreland)
		addHoliday(formatDate(year, 3, 17), "St Patrick's Day", false, 'NIR');

	// 4. Good Friday
	addHoliday(getGoodFriday(year), 'Good Friday');

	// 5. Easter Monday (England, Wales, NI)
	if (!isScotland)
		addHoliday(getEasterMonday(year), 'Easter Monday');

	// 6. Early May Bank Holiday (1st Monday in May)
	addHoliday(getNthWeekdayOfMonth(year, 5, 1, 1), 'Early May Bank Holiday');

	// 7. Spring Bank Holiday (Last Monday in May)
	addHoliday(getNthWeekdayOfMonth(year, 5, 1, -1), 'Spring Bank Holiday');

	// 8. Battle of the Boyne (Orangemen's Day - NI: July 12)
	if (isNorthernIreland)
		addHoliday(formatDate(year, 7, 12), 'Battle of the Boyne', false, 'NIR');

	// 9. Summer Bank Holiday
	if (isScotland) {
		// 1st Monday in August for Scotland
		addHoliday(getNthWeekdayOfMonth(year, 8, 1, 1), 'Summer Bank Holiday', false, 'SCT');
	} else {
		// Last Monday in August for England, Wales, NI
		addHoliday(getNthWeekdayOfMonth(year, 8, 1, -1), 'Summer Bank Holiday');
	}

	// 10. St Andrew's Day (Scotland: Nov 30)
	if (isScotland)
		addHoliday(formatDate(year, 11, 30), "St Andrew's Day", false, 'SCT');

	// 11. Christmas Day & Boxing Day (with dual shift)
	const cDow = getIsoDayOfWeek(year, 12, 25);
	addHoliday(formatDate(year, 12, 25), 'Christmas Day');
	addHoliday(formatDate(year, 12, 26), 'Boxing Day');

	if (includeObserved) {
		if (cDow === 6) {
			addHoliday(formatDate(year, 12, 27), 'Christmas Day (Observed)', true);
			addHoliday(formatDate(year, 12, 28), 'Boxing Day (Observed)', true);
		} else if (cDow === 7) {
			addHoliday(formatDate(year, 12, 27), 'Christmas Day (Observed)', true);
			addHoliday(formatDate(year, 12, 28), 'Boxing Day (Observed)', true);
		} else if (cDow === 5) {
			addHoliday(formatDate(year, 12, 28), 'Boxing Day (Observed)', true);
		}
	}

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
