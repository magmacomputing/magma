import {
	formatDate,
	getIsoDayOfWeek,
	getNthWeekdayOfMonth,
	offsetDate,
} from '../computus.js';
import type { HolidayItem, HolidayCalendarGenerator } from '../types.js';

/** Calculates Vernal Equinox Day in Japan for years 1900 to 2099 */
function getJpVernalEquinoxDay(year: number): number {
	if (year >= 1980 && year <= 2099) {
		return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
	}
	return 20;
}

/** Calculates Autumnal Equinox Day in Japan for years 1980 to 2099 */
function getJpAutumnalEquinoxDay(year: number): number {
	if (year >= 1980 && year <= 2099)
		return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
	return 23;
}

export const generateJpHolidays: HolidayCalendarGenerator = (year: number, _region?: string, includeObserved = true): HolidayItem[] => {
	const holidays: HolidayItem[] = [];
	const country = 'JP';

	const addHoliday = (date: string, name: string, localName: string, isObserved = false) => {
		holidays.push({ date, name, localName, country, isObserved });
	};

	// 1. Ganjitsu (Jan 1)
	addHoliday(formatDate(year, 1, 1), "New Year's Day", '元日');

	// 2. Seijin no Hi (2nd Monday in Jan)
	addHoliday(getNthWeekdayOfMonth(year, 1, 1, 2), 'Coming of Age Day', '成人の日');

	// 3. Kenkoku Kinen no Hi (Feb 11)
	addHoliday(formatDate(year, 2, 11), 'National Foundation Day', '建国記念の日');

	// 4. Tennō Tanjōbi (Feb 23, since 2020)
	if (year >= 2020) {
		addHoliday(formatDate(year, 2, 23), "Emperor's Birthday", '天皇誕生日');
	}

	// 5. Shunbun no Hi (Vernal Equinox)
	const vernalDay = getJpVernalEquinoxDay(year);
	addHoliday(formatDate(year, 3, vernalDay), 'Vernal Equinox Day', '春分の日');

	// 6. Shōwa no Hi (Apr 29)
	addHoliday(formatDate(year, 4, 29), 'Shōwa Day', '昭和の日');

	// 7. Golden Week: Kenpō Kinenbi (May 3), Midori no Hi (May 4), Kodomo no Hi (May 5)
	addHoliday(formatDate(year, 5, 3), 'Constitution Memorial Day', '憲法記念日');
	addHoliday(formatDate(year, 5, 4), 'Greenery Day', 'みどりの日');
	addHoliday(formatDate(year, 5, 5), "Children's Day", 'こどもの日');

	// 8. Umi no Hi (3rd Monday in July)
	addHoliday(getNthWeekdayOfMonth(year, 7, 1, 3), 'Marine Day', '海の日');

	// 9. Yama no Hi (Aug 11, since 2016)
	if (year >= 2016) {
		addHoliday(formatDate(year, 8, 11), 'Mountain Day', '山の日');
	}

	// 10. Keirō no Hi (3rd Monday in Sept)
	const respectDay = getNthWeekdayOfMonth(year, 9, 1, 3);
	addHoliday(respectDay, 'Respect for the Aged Day', '敬老の日');

	// 11. Shūbun no Hi (Autumnal Equinox)
	const autumnalDay = getJpAutumnalEquinoxDay(year);
	const autumnalDate = formatDate(year, 9, autumnalDay);
	addHoliday(autumnalDate, 'Autumnal Equinox Day', '秋分の日');

	// Silver week bridge check (if Respect Day is Monday Sept 21 and Autumnal is Wed Sept 23 -> Tuesday Sept 22 is Citizens' Holiday)
	const rDay = Number(respectDay.split('-')[2]);
	if (autumnalDay - rDay === 2) {
		addHoliday(formatDate(year, 9, rDay + 1), "Citizen's Holiday", '国民の休日');
	}

	// 12. Sports no Hi (2nd Monday in Oct)
	addHoliday(getNthWeekdayOfMonth(year, 10, 1, 2), 'Sports Day', 'スポーツの日');

	// 13. Bunka no Hi (Nov 3)
	addHoliday(formatDate(year, 11, 3), 'Culture Day', '文化の日');

	// 14. Kinrō Kansha no Hi (Nov 23)
	addHoliday(formatDate(year, 11, 23), 'Labor Thanksgiving Day', '勤労感謝の日');

	// Furikae Kyūjitsu (Substitute Holiday):
	// If a holiday falls on a Sunday, the next non-holiday weekday becomes a holiday
	if (includeObserved) {
		const existingDates = new Set(holidays.map(h => h.date));
		const toAdd: HolidayItem[] = [];

		for (const h of holidays) {
			const parts = h.date.split('-').map(Number);
			const dow = getIsoDayOfWeek(parts[0]!, parts[1]!, parts[2]!);
			if (dow === 7) { // Sunday
				let testOffset = 1;
				let subDate = offsetDate(parts[0]!, parts[1]!, parts[2]!, testOffset);
				while (existingDates.has(subDate)) {
					testOffset++;
					subDate = offsetDate(parts[0]!, parts[1]!, parts[2]!, testOffset);
				}
				toAdd.push({
					date: subDate,
					name: `${h.name} (Observed)`,
					localName: '振替休日',
					country,
					isObserved: true,
				});
				existingDates.add(subDate);
			}
		}

		holidays.push(...toAdd);
	}

	return holidays.sort((a, b) => a.date.localeCompare(b.date));
};
