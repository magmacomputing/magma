import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from '@magmacomputing/tempo/plugin/sdk';
import { isNumber } from '@magmacomputing/library';
import type { Tempo } from '@magmacomputing/tempo';

/** definition of astrological zodiac ranges */
const groups = defineRange([
	// Western (Tropical) - @link https://en.wikipedia.org/wiki/Astrological_sign
	{ key: 'Aries', day: 21, month: 3, symbol: 'Ram', trait: 'Daring and energetic, a natural leader', group: 'western' },
	{ key: 'Taurus', day: 20, month: 4, symbol: 'Bull', trait: 'Reliable and patient, enjoys luxury', group: 'western' },
	{ key: 'Gemini', day: 21, month: 5, symbol: 'Twins', trait: 'Adaptable and intellectual, great communicator', group: 'western' },
	{ key: 'Cancer', day: 21, month: 6, symbol: 'Crab', trait: 'Protective and intuitive, deeply emotional', group: 'western' },
	{ key: 'Leo', day: 23, month: 7, symbol: 'Lion', trait: 'Confident and ambitious, loves being center stage', group: 'western' },
	{ key: 'Virgo', day: 23, month: 8, symbol: 'Virgin', trait: 'Analytical and practical, meticulous and kind', group: 'western' },
	{ key: 'Libra', day: 23, month: 9, symbol: 'Scales', trait: 'Diplomatic and fair, values harmony', group: 'western' },
	{ key: 'Scorpio', day: 23, month: 10, symbol: 'Scorpion', trait: 'Passionate and resourceful, dynamic and brave', group: 'western' },
	{ key: 'Sagittarius', day: 22, month: 11, symbol: 'Archer', trait: 'Optimistic and free-spirited, loves travel', group: 'western' },
	{ key: 'Capricorn', day: 22, month: 12, symbol: 'Goat', trait: 'Disciplined and persistent, highly practical', group: 'western' },
	{ key: 'Aquarius', day: 20, month: 1, symbol: 'Water Bearer', trait: 'Original and humanitarian, values independence', group: 'western' },
	{ key: 'Pisces', day: 19, month: 2, symbol: 'Fish', trait: 'Compassionate and artistic, deeply intuitive', group: 'western' },

	// Chinese (Animal) - @link http://www.creativeartsguild.org/images/uploads/categories/12_Chinese_Zodiac_Signs.pdf
	{ key: 'Rat', trait: 'Quick-witted, resourceful', group: 'animal' } as any,
	{ key: 'Ox', trait: 'Diligent, dependable', group: 'animal' } as any,
	{ key: 'Tiger', trait: 'Brave, confident', group: 'animal' } as any,
	{ key: 'Rabbit', trait: 'Quiet, elegant', group: 'animal' } as any,
	{ key: 'Dragon', trait: 'Confident, intelligent', group: 'animal' } as any,
	{ key: 'Snake', trait: 'Enigmatic, intelligent', group: 'animal' } as any,
	{ key: 'Horse', trait: 'Animated, active', group: 'animal' } as any,
	{ key: 'Goat', trait: 'Gentle, shy', group: 'animal' } as any,
	{ key: 'Monkey', trait: 'Smart, curious', group: 'animal' } as any,
	{ key: 'Rooster', trait: 'Observant, hardworking', group: 'animal' } as any,
	{ key: 'Dog', trait: 'Loyal, honest', group: 'animal' } as any,
	{ key: 'Pig', trait: 'Compassionate, generous', group: 'animal' } as any,

	// Chinese (Element) - @link https://www.timeanddate.com/calendar/aboutelements.html
	{ key: 'Wood', group: 'element' } as any,
	{ key: 'Fire', group: 'element' } as any,
	{ key: 'Earth', group: 'element' } as any,
	{ key: 'Metal', group: 'element' } as any,
	{ key: 'Water', group: 'element' } as any,
], 'group');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any) {
	const list = resolveCycleWindow(t, groups, { anchor, groupBy: ['group'], group: 'western' });

	// calculate the Chinese Zodiac based on the year of the candidate sign
	list.forEach((itm: any) => {
		const year = itm.year ?? (anchor?.year);
		if (isNumber(year)) itm['CN'] = getChineseZodiac(year);
	});

	return list;
}

/**
 * ## ZodiacTerm
 * Astrological Zodiac signs
 */
export const ZodiacTerm = defineTerm({
	key: 'zdc',
	scope: 'zodiac',
	description: 'Astrological Zodiac sign',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, resolve(this, anchor), keyOnly, anchor);
	}
});

/** get the chinese zodiac for a given year */
function getChineseZodiac(year: number) {
	const animals = (groups as any)['animal'] ?? [];
	const elements = (groups as any)['element'] ?? [];

	if (animals.length === 0 || elements.length === 0) return undefined;

	const animalIndex = ((year - 4) % 12 + 12) % 12;
	const elementIndex = Math.floor((((year - 4) % 10) + 10) % 10 / 2);
	const yinYang: 'Yin' | 'Yang' = year % 2 === 0 ? 'Yang' : 'Yin';

	const animal = animals[animalIndex];
	const element = elements[elementIndex];

	if (!animal || !element) return undefined;

	return {
		animal: animal.key,
		trait: (animal as any).trait,
		element: element.key,
		yinYang: yinYang
	}
}

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		zdc: 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';
		zodiac: {
			key: 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';
			symbol: 'Ram' | 'Bull' | 'Twins' | 'Crab' | 'Lion' | 'Virgin' | 'Scales' | 'Scorpion' | 'Archer' | 'Goat' | 'Water Bearer' | 'Fish';
			trait: string;
			group: 'western';
			day: number;
			month: number;
			year?: number;
			start: Tempo;
			end: Tempo;
			CN?: {
				animal: string;
				trait: string;
				element: string;
				yinYang: 'Yin' | 'Yang';
			};
		};
	}
}

