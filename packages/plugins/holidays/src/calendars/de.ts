import {
	formatDate,
	getGoodFriday,
	getEasterMonday,
	getAscensionDay,
	getWhitMonday,
	getCorpusChristi,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

export const generateDeHolidays: HolidayCalendarGenerator = (year: number, region?: string): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'DE';
	const reg = region ? region.toUpperCase().replace(/^DE-/, '') : undefined;

	const addHoliday = (date: string, name: string, localName: string, holidayRegion?: string) => {
		if (!holidayRegion || !reg || holidayRegion === reg)
			holidays.push({ date, name, localName, country, region: holidayRegion });
	};

	// 1. Neujahr (Jan 1)
	addHoliday(formatDate(year, 1, 1), "New Year's Day", 'Neujahr');

	// 2. Heilige Drei Könige (Jan 6 - BW, BY, ST)
	if (['BW', 'BY', 'ST'].includes(reg ?? ''))
		addHoliday(formatDate(year, 1, 6), 'Epiphany', 'Heilige Drei Könige', reg);

	// 3. Karfreitag (Good Friday)
	addHoliday(getGoodFriday(year), 'Good Friday', 'Karfreitag');

	// 4. Ostermontag (Easter Monday)
	addHoliday(getEasterMonday(year), 'Easter Monday', 'Ostermontag');

	// 5. Tag der Arbeit (May 1)
	addHoliday(formatDate(year, 5, 1), 'Labour Day', 'Tag der Arbeit');

	// 6. Christi Himmelfahrt (Ascension Day)
	addHoliday(getAscensionDay(year), 'Ascension Day', 'Christi Himmelfahrt');

	// 7. Pfingstmontag (Whit Monday)
	addHoliday(getWhitMonday(year), 'Whit Monday', 'Pfingstmontag');

	// 8. Fronleichnam (Corpus Christi - BW, BY, HE, NW, RP, SL)
	if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(reg ?? ''))
		addHoliday(getCorpusChristi(year), 'Corpus Christi', 'Fronleichnam', reg);

	// 9. Mariä Himmelfahrt (Aug 15 - BY, SL)
	if (['BY', 'SL'].includes(reg ?? ''))
		addHoliday(formatDate(year, 8, 15), 'Assumption Day', 'Mariä Himmelfahrt', reg);

	// 10. Tag der Deutschen Einheit (German Unity Day - Oct 3)
	addHoliday(formatDate(year, 10, 3), 'German Unity Day', 'Tag der Deutschen Einheit');

	// 11. Reformationstag (Reformation Day - Oct 31)
	if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(reg ?? ''))
		addHoliday(formatDate(year, 10, 31), 'Reformation Day', 'Reformationstag', reg);

	// 12. Allerheiligen (All Saints' Day - Nov 1)
	if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(reg ?? ''))
		addHoliday(formatDate(year, 11, 1), "All Saints' Day", 'Allerheiligen', reg);

	// 13. Christmas
	addHoliday(formatDate(year, 12, 25), 'Christmas Day', '1. Weihnachtstag');
	addHoliday(formatDate(year, 12, 26), "St. Stephen's Day", '2. Weihnachtstag');

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
