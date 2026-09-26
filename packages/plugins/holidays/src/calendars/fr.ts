import {
	formatDate,
	getGoodFriday,
	getEasterMonday,
	getAscensionDay,
	getWhitMonday,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

export const generateFrHolidays: HolidayCalendarGenerator = (year: number, region?: string): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'FR';
	const reg = region ? region.toUpperCase().replace(/^FR-/, '') : undefined;
	const isAlsaceMoselle = ['57', '67', '68', 'ALSACE', 'MOSELLE'].includes(reg ?? '');

	const addHoliday = (date: string, name: string, localName: string, holidayRegion?: string) => {
		if (!holidayRegion || !reg || holidayRegion === reg)
			holidays.push({ date, name, localName, country, region: holidayRegion });
	};

	// 1. Jour de l'An (Jan 1)
	addHoliday(formatDate(year, 1, 1), "New Year's Day", "Jour de l'An");

	// 2. Vendredi Saint (Alsace-Moselle only)
	if (isAlsaceMoselle)
		addHoliday(getGoodFriday(year), 'Good Friday', 'Vendredi Saint', reg);

	// 3. Lundi de Pâques (Easter Monday)
	addHoliday(getEasterMonday(year), 'Easter Monday', 'Lundi de Pâques');

	// 4. Fête du Travail (May 1)
	addHoliday(formatDate(year, 5, 1), 'Labour Day', 'Fête du Travail');

	// 5. Victoire 1945 (May 8)
	addHoliday(formatDate(year, 5, 8), 'Victory in Europe Day', 'Victoire 1945');

	// 6. Ascension (Ascension Day)
	addHoliday(getAscensionDay(year), 'Ascension Day', 'Ascension');

	// 7. Lundi de Pentecôte (Whit Monday)
	addHoliday(getWhitMonday(year), 'Whit Monday', 'Lundi de Pentecôte');

	// 8. Fête Nationale / Bastille Day (July 14)
	addHoliday(formatDate(year, 7, 14), 'Bastille Day', 'Fête Nationale');

	// 9. Assomption (Aug 15)
	addHoliday(formatDate(year, 8, 15), 'Assumption of Mary', 'Assomption');

	// 10. Toussaint (Nov 1)
	addHoliday(formatDate(year, 11, 1), "All Saints' Day", 'Toussaint');

	// 11. Armistice 1918 (Nov 11)
	addHoliday(formatDate(year, 11, 11), 'Armistice Day', 'Armistice 1918');

	// 12. Noël (Dec 25)
	addHoliday(formatDate(year, 12, 25), 'Christmas Day', 'Noël');

	// 13. Saint-Étienne (Dec 26 - Alsace-Moselle only)
	if (isAlsaceMoselle)
		addHoliday(formatDate(year, 12, 26), "St. Stephen's Day", 'Saint-Étienne', reg);

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
