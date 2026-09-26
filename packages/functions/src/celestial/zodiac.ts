export type WesternZodiacSign =
	| 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
	| 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
	| 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export interface ChineseZodiacResult {
	animal: string;
	element: string;
	yinYang: 'Yin' | 'Yang';
}

/**
 * Calculates the Western Tropical Zodiac sign for a given date.
 *
 * @param dateInput - Date, Temporal object, or epoch timestamp in ms
 * @returns Western Zodiac sign string name
 */
export function getZodiacSign(dateInput: Date | number | string): WesternZodiacSign {
	const date = typeof dateInput === 'object' && 'getMonth' in dateInput ? dateInput : new Date(dateInput);
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();

	if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
	if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
	if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
	if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
	if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
	if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
	if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
	if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
	if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
	if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
	if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
	return 'Pisces';
}

/**
 * Calculates the Chinese Zodiac animal, element, and Yin/Yang state for a given year.
 *
 * @param year - Year (e.g. 2026)
 * @returns Chinese Zodiac object with animal, element, and yinYang
 */
export function getChineseZodiac(year: number): ChineseZodiacResult {
	const animals = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
	const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

	const animalIndex = ((year - 4) % 12 + 12) % 12;
	const elementIndex = Math.floor((((year - 4) % 10) + 10) % 10 / 2);
	const yinYang: 'Yin' | 'Yang' = year % 2 === 0 ? 'Yang' : 'Yin';

	return {
		animal: animals[animalIndex]!,
		element: elements[elementIndex]!,
		yinYang,
	};
}
