import { definePlugin } from 'tempo-kit/plugin/sdk';
import type { Tempo } from 'tempo-kit';

import {
	ZodiacTerm,
	SunSignTerm,
	StarSignTerm,
	ZODIAC_KEYS,
	type WesternZodiacKey,
	type WesternZodiacScope,
} from './zodiac.js';
import {
	EasternTerm,
	LunarSignTerm,
	EasternZodiacTerm,
	EASTERN_ANIMAL_KEYS,
	type EasternAnimalKey,
	type EasternZodiacScope,
	type LunarZodiacVariants,
	type RegionalVariant,
} from './eastern.js';

export const CulturalTerms = [
	ZodiacTerm,
	EasternTerm,
] as const;

export const CulturalPlugin = definePlugin({
	name: '@tempo-kit/plugin-cultural',
	version: '1.0.0',
	install(TempoClass: typeof Tempo) {
		TempoClass.use([ZodiacTerm, EasternTerm]);
	},
});

export {
	ZodiacTerm,
	SunSignTerm,
	StarSignTerm,
	ZODIAC_KEYS,
	EasternTerm,
	LunarSignTerm,
	EasternZodiacTerm,
	EASTERN_ANIMAL_KEYS,
};

export type {
	WesternZodiacKey,
	WesternZodiacScope,
	EasternAnimalKey,
	EasternZodiacScope,
	LunarZodiacVariants,
	RegionalVariant,
};

export default CulturalPlugin;
