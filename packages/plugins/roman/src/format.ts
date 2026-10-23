import { toRoman } from '@magmacomputing/tempo/plugin/sdk';
import type {
	ClassicalRomanDate,
	RomanFormatOptions,
	RomanGrammaticalCase,
} from './types.js';
import {
	ANCHOR_ABLATIVE,
	ANCHOR_ACCUSATIVE,
	ANCHOR_NOMINATIVE,
	ANCHOR_SHORT,
	COUNT_WORDS_ACCUSATIVE,
	MONTH_ABLATIVE,
	MONTH_ACCUSATIVE,
	MONTH_NOMINATIVE,
	MONTH_SHORT,
} from './constants.js';
import { formatConsuls } from './consuls.js';

/**
 * Formats a classical Roman calendar date into a Latin phrase or abbreviation.
 *
 * @param roman - The structured ClassicalRomanDate
 * @param options - Formatting configuration (case, style, AUC, words, casing)
 * @returns Formatted classical Roman string
 */
export function formatClassicalRomanDate(
	roman: ClassicalRomanDate,
	options?: RomanFormatOptions,
): string {
	const grammarCase: RomanGrammaticalCase = options?.case ?? 'customary';
	const style = options?.style ?? 'classical';
	const useWords = options?.words ?? false;
	const isShort = style === 'short';

	let result = '';

	if (roman.isBissextile) {
		if (isShort) {
			result = 'a.d. bis VI Kal. Mart.';
		} else {
			result = 'ante diem bis sextum Kalendas Martias';
		}
	} else if (roman.relation === 'on') {
		if (isShort) {
			result = `${ANCHOR_SHORT[roman.anchor]} ${MONTH_SHORT[roman.anchorMonth]}`;
		} else {
			switch (grammarCase) {
				case 'nominative':
					result = `${ANCHOR_NOMINATIVE[roman.anchor]} ${MONTH_NOMINATIVE[roman.anchorMonth]}`;
					break;
				case 'accusative':
					result = `${ANCHOR_ACCUSATIVE[roman.anchor]} ${MONTH_ACCUSATIVE[roman.anchorMonth]}`;
					break;
				case 'ablative':
				case 'customary':
				default:
					result = `${ANCHOR_ABLATIVE[roman.anchor]} ${MONTH_ABLATIVE[roman.anchorMonth]}`;
					break;
			}
		}
	} else if (roman.relation === 'pridie') {
		if (isShort) {
			result = `Prid. ${ANCHOR_SHORT[roman.anchor]} ${MONTH_SHORT[roman.anchorMonth]}`;
		} else {
			switch (grammarCase) {
				case 'nominative':
					result = `Pridie ${ANCHOR_NOMINATIVE[roman.anchor]} ${MONTH_NOMINATIVE[roman.anchorMonth]}`;
					break;
				case 'ablative':
					result = `Pridie ${ANCHOR_ABLATIVE[roman.anchor]} ${MONTH_ABLATIVE[roman.anchorMonth]}`;
					break;
				case 'accusative':
				case 'customary':
				default:
					result = `Pridie ${ANCHOR_ACCUSATIVE[roman.anchor]} ${MONTH_ACCUSATIVE[roman.anchorMonth]}`;
					break;
			}
		}
	} else {
		// ante_diem
		const numeral = (useWords && COUNT_WORDS_ACCUSATIVE[roman.count])
			? COUNT_WORDS_ACCUSATIVE[roman.count]
			: (roman.romanNumeral || toRoman(roman.count));

		if (isShort) {
			result = `a.d. ${roman.romanNumeral || toRoman(roman.count)} ${ANCHOR_SHORT[roman.anchor]} ${MONTH_SHORT[roman.anchorMonth]}`;
		} else {
			switch (grammarCase) {
				case 'nominative':
					result = `ante diem ${numeral} ${ANCHOR_NOMINATIVE[roman.anchor]} ${MONTH_NOMINATIVE[roman.anchorMonth]}`;
					break;
				case 'ablative':
					result = `ante diem ${numeral} ${ANCHOR_ABLATIVE[roman.anchor]} ${MONTH_ABLATIVE[roman.anchorMonth]}`;
					break;
				case 'accusative':
				case 'customary':
				default:
					result = `ante diem ${numeral} ${ANCHOR_ACCUSATIVE[roman.anchor]} ${MONTH_ACCUSATIVE[roman.anchorMonth]}`;
					break;
			}
		}
	}

	if (options?.auc) {
		const aucFormatted = options.aucFormat === 'numeric'
			? `AUC ${roman.auc}`
			: `AUC ${toRoman(roman.auc)}`;
		result = `${result} ${aucFormatted}`;
	}

	if (options?.casing) {
		switch (options.casing) {
			case 'upper':
				result = result.toUpperCase();
				break;
			case 'lower':
				result = result.toLowerCase();
				break;
			case 'capitalize':
				result = result.charAt(0).toUpperCase() + result.slice(1);
				break;
			default:
				break;
		}
	}

	return result;
}

/**
 * Creates the token evaluator callback registered with Tempo's format registry (`tokens.roman`).
 * Supports:
 * - `{roman}`: Full classical date (customary case)
 * - `{roman:classical}`: Full classical date
 * - `{roman:short}`: Abbreviated classical date
 * - `{roman:auc}`: Year AUC (e.g. "AUC MMDCCLXXIX")
 * - `{roman:auc:num}`: Numeric year AUC (e.g. "2779")
 * - `{roman:nominative}`: Nominative case date
 * - `{roman:accusative}`: Accusative case date
 * - `{roman:ablative}`: Ablative case date
 * - Combined with `:upper`, `:lower`, `:capitalize`, `:words`, `:auc`
 */
export function createRomanTokenEvaluator(
	calculator: (year: number, month: number, day: number) => ClassicalRomanDate,
): (zdt: { year: number; month: number; day: number }, context?: { modifiers?: string[]; config?: any }) => string {
	return (zdt, context) => {
		const rawMods = context?.modifiers ?? [];
		const mods = rawMods.map(m => m.toLowerCase());

		// If sole token request is for AUC
		if (mods.includes('auc') && !mods.includes('classical') && !mods.includes('short') && !mods.includes('nominative') && !mods.includes('accusative') && !mods.includes('ablative') && !mods.includes('consul')) {
			const auc = zdt.year + 753; // AUC_OFFSET
			let aucStr = (mods.includes('num') || mods.includes('numeric'))
				? String(auc)
				: (mods.includes('raw') ? (toRoman(auc) || String(auc)) : `AUC ${toRoman(auc) || auc}`);

			if (mods.includes('upper')) aucStr = aucStr.toUpperCase();
			if (mods.includes('lower')) aucStr = aucStr.toLowerCase();
			return aucStr;
		}

		// If token request is for Roman Consul pair
		if (mods.includes('consul') || mods.includes('consuls')) {
			const style = (mods.includes('nominative') || mods.includes('nom')) ? 'nominative' : 'ablative';
			let consulStr = formatConsuls(zdt.year, style) ?? '';
			if (mods.includes('upper')) consulStr = consulStr.toUpperCase();
			if (mods.includes('lower')) consulStr = consulStr.toLowerCase();
			return consulStr;
		}

		const roman = calculator(zdt.year, zdt.month, zdt.day);

		const options: RomanFormatOptions = {};

		if (mods.includes('short')) options.style = 'short';
		else options.style = 'classical';

		if (mods.includes('nominative')) options.case = 'nominative';
		else if (mods.includes('accusative')) options.case = 'accusative';
		else if (mods.includes('ablative')) options.case = 'ablative';
		else options.case = 'customary';

		if (mods.includes('words')) options.words = true;
		if (mods.includes('auc')) options.auc = true;
		if (mods.includes('num') || mods.includes('numeric')) options.aucFormat = 'numeric';

		if (mods.includes('upper')) options.casing = 'upper';
		else if (mods.includes('lower')) options.casing = 'lower';
		else if (mods.includes('capitalize')) options.casing = 'capitalize';

		return formatClassicalRomanDate(roman, options);
	};
}
