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
