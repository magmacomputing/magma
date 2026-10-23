import type { RomanAnchor } from './types.js';

/**
 * Traditional founding of Rome in 753 BCE.
 */
export const AUC_OFFSET = 753;

/**
 * Months with Nones on the 7th and Ides on the 15th ("MOM-J": March, October, May, July).
 */
export const MOMJ_MONTHS: ReadonlySet<number> = new Set([3, 5, 7, 10]);

/**
 * Latin anchor names in the Nominative case (used when date is subject or title).
 */
export const ANCHOR_NOMINATIVE: Readonly<Record<RomanAnchor, string>> = Object.freeze({
	Kalends: 'Kalendae',
	Nones: 'Nonae',
	Ides: 'Idus',
});

/**
 * Latin anchor names in the Ablative case (used for dates on the anchor itself).
 */
export const ANCHOR_ABLATIVE: Readonly<Record<RomanAnchor, string>> = Object.freeze({
	Kalends: 'Kalendis',
	Nones: 'Nonis',
	Ides: 'Idibus',
});

/**
 * Latin anchor names in the Accusative case (used after `ante diem` or `pridie`).
 */
export const ANCHOR_ACCUSATIVE: Readonly<Record<RomanAnchor, string>> = Object.freeze({
	Kalends: 'Kalendas',
	Nones: 'Nonas',
	Ides: 'Idus',
});

/**
 * Standard Latin anchor abbreviations.
 */
export const ANCHOR_SHORT: Readonly<Record<RomanAnchor, string>> = Object.freeze({
	Kalends: 'Kal.',
	Nones: 'Non.',
	Ides: 'Id.',
});

/**
 * Latin month adjective names in the Nominative feminine plural (modifying Kalendae, Nonae, Idus).
 */
export const MONTH_NOMINATIVE: readonly string[] = Object.freeze([
	'',
	'Januariae',
	'Februariae',
	'Martiae',
	'Apriles',
	'Maiae',
	'Juniae',
	'Juliae',
	'Augustae',
	'Septembres',
	'Octobres',
	'Novembres',
	'Decembres',
]);

/**
 * Latin month adjective names in the Accusative feminine plural (modifying Kalendas, Nonas, Idus).
 */
export const MONTH_ACCUSATIVE: readonly string[] = Object.freeze([
	'',
	'Januarias',
	'Februarias',
	'Martias',
	'Apriles',
	'Maias',
	'Junias',
	'Julias',
	'Augustas',
	'Septembres',
	'Octobres',
	'Novembres',
	'Decembres',
]);

/**
 * Latin month adjective names in the Ablative feminine plural (modifying Kalendis, Nonis, Idibus).
 */
export const MONTH_ABLATIVE: readonly string[] = Object.freeze([
	'',
	'Januariis',
	'Februariis',
	'Martiis',
	'Aprilibus',
	'Maiis',
	'Juniis',
	'Juliis',
	'Augustiis',
	'Septembribus',
	'Octobribus',
	'Novembribus',
	'Decembribus',
]);

/**
 * Standard Latin month abbreviations.
 */
export const MONTH_SHORT: readonly string[] = Object.freeze([
	'',
	'Jan.',
	'Feb.',
	'Mart.',
	'Apr.',
	'Mai.',
	'Jun.',
	'Jul.',
	'Aug.',
	'Sept.',
	'Oct.',
	'Nov.',
	'Dec.',
]);

/**
 * Latin ordinal numeral words in the Accusative singular masculine (modifying diem in "ante diem").
 */
export const COUNT_WORDS_ACCUSATIVE: readonly string[] = Object.freeze([
	'',
	'',
	'pridie',
	'tertium',
	'quartum',
	'quintum',
	'sextum',
	'septimum',
	'octavum',
	'nonum',
	'decimum',
	'undecimum',
	'duodecimum',
	'tertium decimum',
	'quartum decimum',
	'quintum decimum',
	'sextum decimum',
	'septimum decimum',
	'duodevicesimum',
	'undevicesimum',
]);

/**
 * Latin ordinal numeral words in the Ablative singular masculine (modifying die in "die ... ante").
 */
export const COUNT_WORDS_ABLATIVE: readonly string[] = Object.freeze([
	'',
	'',
	'pridie',
	'tertio',
	'quarto',
	'quinto',
	'sexto',
	'septimo',
	'octavo',
	'nono',
	'decimo',
	'undecimo',
	'duodecimo',
	'tertio decimo',
	'quarto decimo',
	'quinto decimo',
	'sexto decimo',
	'septimo decimo',
	'duodevicesimo',
	'undevicesimo',
]);
