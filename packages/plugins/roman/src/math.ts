import { toRoman } from '@magmacomputing/tempo/plugin/sdk';
import { getDaysInMonth, isLeapYear } from '@magmacomputing/tempo/library';
import type {
	ClassicalRomanDate,
	RomanAnchor,
	RomanCalculationOptions,
	RomanDateRelation,
	RomanFormatOptions,
} from './types.js';
import { formatClassicalRomanDate } from './format.js';
import {
	ANCHOR_ABLATIVE,
	ANCHOR_ACCUSATIVE,
	ANCHOR_SHORT,
	AUC_OFFSET,
	MOMJ_MONTHS,
	MONTH_ABLATIVE,
	MONTH_ACCUSATIVE,
	MONTH_SHORT,
} from './constants.js';

/** Returns the day of the month for the Nones (7th for March, May, July, October; 5th otherwise). */
export function getNonesDay(month: number): number {
	return MOMJ_MONTHS.has(month) ? 7 : 5;
}

/** Returns the day of the month for the Ides (15th for March, May, July, October; 13th otherwise). */
export function getIdesDay(month: number): number {
	return MOMJ_MONTHS.has(month) ? 15 : 13;
}

/** Converts an astronomical or historical year to Ab Urbe Condta (AUC). */
export function yearToAuc(year: number, era?: 'CE' | 'BCE'): number {
	if (era === 'BCE') return 754 - Math.abs(year);
	if (era === 'CE') return Math.abs(year) + AUC_OFFSET;
	return year + AUC_OFFSET;																	// astronomical year handling
}

/** Converts an AUC year back to astronomical or historical representation. */
export function aucToYear(auc: number, format: 'astronomical' | 'historical' = 'astronomical'):
	number | { year: number; era: 'CE' | 'BCE' } {
	if (format === 'historical') {
		if (auc >= 754) return Object.freeze({ year: auc - AUC_OFFSET, era: 'CE' });
		if (auc >= 1) return Object.freeze({ year: 754 - auc, era: 'BCE' });
		return Object.freeze({ year: Math.abs(auc - 754) + 1, era: 'BCE' });
	}
	return auc - AUC_OFFSET;
}

/** Computes the classical Roman calendar date representation for a calendar date. */
export function calculateClassicalRomanDate(
	year: number,
	month: number,
	day: number,
	options?: RomanCalculationOptions,
): ClassicalRomanDate {
	const isJulian = options?.isJulian ?? false;
	const bissextile = options?.bissextile ?? true;
	const leap = isLeapYear(year, isJulian);
	const nones = getNonesDay(month);
	const ides = getIdesDay(month);

	let anchor: RomanAnchor;
	let anchorMonth = month;
	let anchorYear = year;
	let relation: RomanDateRelation;
	let count = 1;
	let isBissextileDay = false;

	if (day === 1) {
		anchor = 'Kalends';
		relation = 'on';
		count = 1;
	} else if (day < nones) {
		anchor = 'Nones';
		count = nones - day + 1;
		relation = count === 2 ? 'pridie' : 'ante_diem';
	} else if (day === nones) {
		anchor = 'Nones';
		relation = 'on';
		count = 1;
	} else if (day < ides) {
		anchor = 'Ides';
		count = ides - day + 1;
		relation = count === 2 ? 'pridie' : 'ante_diem';
	} else if (day === ides) {
		anchor = 'Ides';
		relation = 'on';
		count = 1;
	} else {
		anchor = 'Kalends';
		anchorMonth = month === 12 ? 1 : month + 1;
		anchorYear = month === 12 ? year + 1 : year;
		if (month === 2 && leap && bissextile) {
			if (day === 24) {
				count = 6;
				relation = 'ante_diem';
				isBissextileDay = true;
			} else if (day === 25) {
				count = 6;
				relation = 'ante_diem';
				isBissextileDay = false;
			} else if (day > 25) {
				count = 29 - day + 2;
				relation = count === 2 ? 'pridie' : 'ante_diem';
			} else {
				count = 30 - day;
				relation = 'ante_diem';
			}
		} else {
			const daysInCurrentMonth = getDaysInMonth(year, month, isJulian);
			count = daysInCurrentMonth - day + 2;
			relation = count === 2 ? 'pridie' : 'ante_diem';
		}
	}

	const romanNumeral = relation === 'ante_diem' && !isBissextileDay ? toRoman(count) : '';

	let latin = '';
	let shortLatin = '';
	if (isBissextileDay) {
		latin = 'ante diem bis sextum Kalendas Martias';
		shortLatin = 'a.d. bis VI Kal. Mart.';
	} else if (relation === 'on') {
		latin = `${ANCHOR_ABLATIVE[anchor]} ${MONTH_ABLATIVE[anchorMonth]}`;
		shortLatin = `${ANCHOR_SHORT[anchor]} ${MONTH_SHORT[anchorMonth]}`;
	} else if (relation === 'pridie') {
		latin = `Pridie ${ANCHOR_ACCUSATIVE[anchor]} ${MONTH_ACCUSATIVE[anchorMonth]}`;
		shortLatin = `Prid. ${ANCHOR_SHORT[anchor]} ${MONTH_SHORT[anchorMonth]}`;
	} else {
		latin = `ante diem ${romanNumeral} ${ANCHOR_ACCUSATIVE[anchor]} ${MONTH_ACCUSATIVE[anchorMonth]}`;
		shortLatin = `a.d. ${romanNumeral} ${ANCHOR_SHORT[anchor]} ${MONTH_SHORT[anchorMonth]}`;
	}

	const auc = yearToAuc(year);

	const base = {
		anchor,
		anchorMonth,
		anchorYear,
		relation,
		count,
		romanNumeral: isBissextileDay ? 'bis VI' : romanNumeral,
		isBissextile: isBissextileDay,
		day,
		month,
		year,
		auc,
		latin,
		shortLatin,
	} as ClassicalRomanDate;

	const nominative = formatClassicalRomanDate(base, { case: 'nominative', style: 'classical' });
	const accusative = formatClassicalRomanDate(base, { case: 'accusative', style: 'classical' });
	const ablative = formatClassicalRomanDate(base, { case: 'ablative', style: 'classical' });

	return Object.freeze({
		...base,
		nominative,
		accusative,
		ablative,
		format(this: ClassicalRomanDate, opts?: RomanFormatOptions): string {
			return formatClassicalRomanDate(this, opts);
		},
	});
}

/** Resolves a Roman calendar anchor back to a Gregorian date. */
export function calculateGregorianFromRoman(
	anchor: RomanAnchor,
	anchorMonth: number,
	anchorYear: number,
	relation: RomanDateRelation,
	count: number = 1,
	isBissextile: boolean = false,
	isJulian: boolean = false,
	bissextile: boolean = true,
): { year: number; month: number; day: number } {
	if (anchor === 'Kalends') {
		if (relation === 'on') return Object.freeze({ year: anchorYear, month: anchorMonth, day: 1 });
		const targetMonth = anchorMonth === 1 ? 12 : anchorMonth - 1;
		const targetYear = anchorMonth === 1 ? anchorYear - 1 : anchorYear;
		const leap = isLeapYear(targetYear, isJulian);
		const effectiveCount = relation === 'pridie' ? 2 : count;
		if (targetMonth === 2 && leap && bissextile) {
			if (isBissextile) return Object.freeze({ year: targetYear, month: 2, day: 24 });
			if (effectiveCount === 6 && !isBissextile) return Object.freeze({ year: targetYear, month: 2, day: 25 });
			if (effectiveCount < 6) return Object.freeze({ year: targetYear, month: 2, day: 29 - effectiveCount + 2 });
			return Object.freeze({ year: targetYear, month: 2, day: 30 - effectiveCount });
		}
		const daysInMonth = getDaysInMonth(targetYear, targetMonth, isJulian);
		return Object.freeze({ year: targetYear, month: targetMonth, day: daysInMonth - effectiveCount + 2 });
	}
	if (anchor === 'Nones') {
		const nonesDay = getNonesDay(anchorMonth);
		if (relation === 'on') return Object.freeze({ year: anchorYear, month: anchorMonth, day: nonesDay });
		const effectiveCount = relation === 'pridie' ? 2 : count;
		return Object.freeze({ year: anchorYear, month: anchorMonth, day: nonesDay - effectiveCount + 1 });
	}
	const idesDay = getIdesDay(anchorMonth);
	if (relation === 'on') return Object.freeze({ year: anchorYear, month: anchorMonth, day: idesDay });
	const effectiveCount = relation === 'pridie' ? 2 : count;
	return Object.freeze({ year: anchorYear, month: anchorMonth, day: idesDay - effectiveCount + 1 });
}
