import {
	formatDate,
	getIsoDayOfWeek,
	offsetDate,
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

	// 3. Internationaler Frauentag (March 8 - BE from 2019, MV from 2023)
	if (year >= 2019 && ['BE', 'MV'].includes(reg ?? ''))
		addHoliday(formatDate(year, 3, 8), "International Women's Day", 'Internationaler Frauentag', reg);

	// 4. Karfreitag (Good Friday)
	addHoliday(getGoodFriday(year), 'Good Friday', 'Karfreitag');

	// 5. Ostermontag (Easter Monday)
	addHoliday(getEasterMonday(year), 'Easter Monday', 'Ostermontag');

	// 6. Tag der Arbeit (May 1)
	addHoliday(formatDate(year, 5, 1), 'Labour Day', 'Tag der Arbeit');

	// 7. Christi Himmelfahrt (Ascension Day)
	addHoliday(getAscensionDay(year), 'Ascension Day', 'Christi Himmelfahrt');

	// 8. Pfingstmontag (Whit Monday)
	addHoliday(getWhitMonday(year), 'Whit Monday', 'Pfingstmontag');

	// 9. Fronleichnam (Corpus Christi - BW, BY, HE, NW, RP, SL)
	if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(reg ?? ''))
		addHoliday(getCorpusChristi(year), 'Corpus Christi', 'Fronleichnam', reg);

	// 10. Mariä Himmelfahrt (Aug 15 - BY, SL)
	if (['BY', 'SL'].includes(reg ?? ''))
		addHoliday(formatDate(year, 8, 15), 'Assumption Day', 'Mariä Himmelfahrt', reg);

	// 11. Weltkindertag (Sep 20 - TH from 2019)
	if (year >= 2019 && reg === 'TH')
		addHoliday(formatDate(year, 9, 20), "World Children's Day", 'Weltkindertag', 'TH');

	// 12. Tag der Deutschen Einheit (German Unity Day - Oct 3)
	addHoliday(formatDate(year, 10, 3), 'German Unity Day', 'Tag der Deutschen Einheit');

	// 13. Reformationstag (Reformation Day - Oct 31)
	if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(reg ?? ''))
		addHoliday(formatDate(year, 10, 31), 'Reformation Day', 'Reformationstag', reg);

	// 14. Allerheiligen (All Saints' Day - Nov 1)
	if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(reg ?? ''))
		addHoliday(formatDate(year, 11, 1), "All Saints' Day", 'Allerheiligen', reg);

	// 15. Buß- und Bettag (Wednesday before Nov 23 - SN)
	if (reg === 'SN') {
		const dow23 = getIsoDayOfWeek(year, 11, 23);
		const daysBack = (dow23 - 3 + 7) % 7 || 7;
		addHoliday(offsetDate(year, 11, 23, -daysBack), 'Repentance and Prayer Day', 'Buß- und Bettag', 'SN');
	}

	// 16. Christmas
	addHoliday(formatDate(year, 12, 25), 'Christmas Day', '1. Weihnachtstag');
	addHoliday(formatDate(year, 12, 26), "St. Stephen's Day", '2. Weihnachtstag');

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
