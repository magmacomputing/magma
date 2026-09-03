import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';

/** definition of Western (Tropical) astrological zodiac ranges */
const groups = defineRange([
	// Western (Tropical) - @link https://en.wikipedia.org/wiki/Astrological_sign
	{ key: 'Aries', day: 21, month: 3, symbol: 'Ram', emoji: '♈', trait: 'Daring and energetic, a natural leader', group: 'western' },
	{ key: 'Taurus', day: 20, month: 4, symbol: 'Bull', emoji: '♉', trait: 'Reliable and patient, enjoys luxury', group: 'western' },
	{ key: 'Gemini', day: 21, month: 5, symbol: 'Twins', emoji: '♊', trait: 'Adaptable and intellectual, great communicator', group: 'western' },
	{ key: 'Cancer', day: 21, month: 6, symbol: 'Crab', emoji: '♋', trait: 'Protective and intuitive, deeply emotional', group: 'western' },
	{ key: 'Leo', day: 23, month: 7, symbol: 'Lion', emoji: '♌', trait: 'Confident and ambitious, loves being center stage', group: 'western' },
	{ key: 'Virgo', day: 23, month: 8, symbol: 'Virgin', emoji: '♍', trait: 'Analytical and practical, meticulous and kind', group: 'western' },
	{ key: 'Libra', day: 23, month: 9, symbol: 'Scales', emoji: '♎', trait: 'Diplomatic and fair, values harmony', group: 'western' },
	{ key: 'Scorpio', day: 23, month: 10, symbol: 'Scorpion', emoji: '♏', trait: 'Passionate and resourceful, dynamic and brave', group: 'western' },
	{ key: 'Sagittarius', day: 22, month: 11, symbol: 'Archer', emoji: '♐', trait: 'Optimistic and free-spirited, loves travel', group: 'western' },
	{ key: 'Capricorn', day: 22, month: 12, symbol: 'Goat', emoji: '♑', trait: 'Disciplined and persistent, highly practical', group: 'western' },
	{ key: 'Aquarius', day: 20, month: 1, symbol: 'Water Bearer', emoji: '♒', trait: 'Original and humanitarian, values independence', group: 'western' },
	{ key: 'Pisces', day: 19, month: 2, symbol: 'Fish', emoji: '♓', trait: 'Compassionate and artistic, deeply intuitive', group: 'western' },
], 'group');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any) {
	return resolveCycleWindow(t, groups, { anchor, groupBy: ['group'], group: 'western' });
}

export type WesternZodiacKey = 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export interface WesternZodiacScope {
	key: WesternZodiacKey;
	symbol: 'Ram' | 'Bull' | 'Twins' | 'Crab' | 'Lion' | 'Virgin' | 'Scales' | 'Scorpion' | 'Archer' | 'Goat' | 'Water Bearer' | 'Fish';
	emoji: string;
	trait: string;
	group: 'western';
	day: number;
	month: number;
	year?: number;
	start: Tempo;
	end: Tempo;
}

/**
 * ## ZodiacTerm
 * Astrological Western Tropical Zodiac signs (`t.term.zdc`, `t.term.zodiac`, `t.term.sunSign`, `t.term.starSign`).
 */
export const ZodiacTerm = defineTerm({
	key: 'zdc',
	scope: 'zodiac',
	aliases: ['sunSign', 'starSign'],
	description: 'Astrological Western Tropical Zodiac sign',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, resolve(this, anchor), keyOnly, anchor);
	}
});

export const SunSignTerm = ZodiacTerm;
export const StarSignTerm = ZodiacTerm;

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		zdc: WesternZodiacKey;
		sunSign: WesternZodiacKey;
		starSign: WesternZodiacKey;
		zodiac: WesternZodiacScope;
	}
}

