import { isInteger, isNumber, isUndefined, toRoman } from '@magmacomputing/tempo/plugin/sdk';
import type {
	ClassicalRomanDate,
	RomanAnchor,
	RomanCalculationOptions,
	RomanDateRelation,
} from './types.js';
import {
	ANCHOR_ABLATIVE,
	ANCHOR_ACCUSATIVE,
	ANCHOR_SHORT,
	AUC_OFFSET,
	DAYS_IN_MONTH,
	MOMJ_MONTHS,
	MONTH_ABLATIVE,
	MONTH_ACCUSATIVE,
	MONTH_SHORT,
} from './constants.js';

/**
 * Determines whether a year is a leap year under Julian or Gregorian rules.
 *
 * @param year - Astronomical year
 * @param isJulian - If true, uses proleptic Julian 4-year rule; if false, standard Gregorian rule
 */
export function isLeapYear(year: number, isJulian: boolean = false): boolean {
	if (isJulian) {
		const mod = ((year % 4) + 4) % 4;
		return mod === 0;
	}

	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the total days in the given month for a given year.
 */
export function getDaysInMonth(year: number, month: number, isJulian: boolean = false): number {
	if (month === 2)
		return isLeapYear(year, isJulian) ? 29 : 28;

	return DAYS_IN_MONTH[month] ?? 30;
}

/**
 * Returns the day of the month for the Nones (7th for March, May, July, October; 5th otherwise).
 */
export function getNonesDay(month: number): number {
	return MOMJ_MONTHS.has(month)
		? 7
		: 5;
}

/**
 * Returns the day of the month for the Ides (15th for March, May, July, October; 13th otherwise).
 */
export function getIdesDay(month: number): number {
	return MOMJ_MONTHS.has(month)
		? 15
		: 13;
}

/**
 * Converts an astronomical year or historical year with era into Ab Urbe Condita (AUC).
 *
 * @param year - Astronomical year (e.g. 2026, 0 for 1 BCE, -43 for 44 BCE) or positive historical year
 * @param era - Optional era indicator ('CE' or 'BCE')
 */
export function yearToAuc(year: number, era?: 'CE' | 'BCE'): number {
	if (era === 'BCE') {
		const positiveYear = Math.abs(year);
		return 754 - positiveYear;
	}

	if (era === 'CE')
		return Math.abs(year) + AUC_OFFSET;

	// Astronomical year (0 = 1 BCE, -43 = 44 BCE, -752 = 753 BCE)
	return year + AUC_OFFSET;
}

/**
 * Converts an Ab Urbe Condita (AUC) year into an astronomical or historical year.
 */
export function aucToYear(auc: number, format?: 'astronomical'): number;
export function aucToYear(auc: number, format: 'historical'): { year: number; era: 'CE' | 'BCE' };
export function aucToYear(
	auc: number,
	format: 'astronomical' | 'historical' = 'astronomical',
): number | { year: number; era: 'CE' | 'BCE' } {
	if (format === 'historical') {
		if (auc >= 754)
			return Object.freeze({ year: auc - AUC_OFFSET, era: 'CE' });

		if (auc >= 1)
			return Object.freeze({ year: 754 - auc, era: 'BCE' });

		return Object.freeze({ year: Math.abs(auc - 754) + 1, era: 'BCE' });
	}

	return auc - AUC_OFFSET;
}

/**
 * Computes the classical Roman calendar date representation for a calendar date.
 */
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
		relation = (count === 2)
			? 'pridie'
			: 'ante_diem';
	} else if (day === nones) {
		anchor = 'Nones';
		relation = 'on';
		count = 1;
	} else if (day < ides) {
		anchor = 'Ides';
		count = ides - day + 1;
		relation = (count === 2)
			? 'pridie'
			: 'ante_diem';
	} else if (day === ides) {
		anchor = 'Ides';
		relation = 'on';
		count = 1;
	} else {
		// Day is past the Ides: backward count to Kalends of following month
		anchor = 'Kalends';
		anchorMonth = (month === 12)
			? 1
			: month + 1;
		anchorYear = (month === 12)
			? year + 1
			: year;

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
				relation = (count === 2)
					? 'pridie'
					: 'ante_diem';
			} else {
				// 14 <= day <= 23 (Terminalia and preceding days)
				count = 30 - day;
				relation = 'ante_diem';
			}
		} else {
			const daysInCurrentMonth = getDaysInMonth(year, month, isJulian);
			count = daysInCurrentMonth - day + 2;
			relation = (count === 2)
				? 'pridie'
				: 'ante_diem';
		}
	}

	const romanNumeral = (relation === 'ante_diem' && !isBissextileDay)
		? toRoman(count)
		: '';

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

	return Object.freeze({
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
	});
}

/**
 * Resolves a Roman calendar anchor, relation, and count back to calendar year, month, and day.
 */
export function calculateGregorianFromRoman(
	anchor: RomanAnchor,
	anchorMonth: number,
	anchorYear: number,
	relation: RomanDateRelation,
	count: number = 1,
	isBissextile: boolean = false,
	isJulian: boolean = false,
): { year: number; month: number; day: number } {
	if (anchor === 'Kalends') {
		if (relation === 'on')
			return Object.freeze({ year: anchorYear, month: anchorMonth, day: 1 });

		const targetMonth = (anchorMonth === 1)
			? 12
			: anchorMonth - 1;
		const targetYear = (anchorMonth === 1)
			? anchorYear - 1
			: anchorYear;
		const leap = isLeapYear(targetYear, isJulian);
		const effectiveCount = (relation === 'pridie')
			? 2
			: count;

		if (targetMonth === 2 && leap) {
			if (isBissextile)
				return Object.freeze({ year: targetYear, month: 2, day: 24 });

			if (effectiveCount === 6 && !isBissextile)
				return Object.freeze({ year: targetYear, month: 2, day: 25 });

			if (effectiveCount < 6)
				return Object.freeze({ year: targetYear, month: 2, day: 29 - effectiveCount + 2 });

			return Object.freeze({ year: targetYear, month: 2, day: 30 - effectiveCount });
		}

		const daysInMonth = getDaysInMonth(targetYear, targetMonth, isJulian);
		return Object.freeze({
			year: targetYear,
			month: targetMonth,
			day: daysInMonth - effectiveCount + 2,
		});
	}

	if (anchor === 'Nones') {
		const nonesDay = getNonesDay(anchorMonth);
		if (relation === 'on')
			return Object.freeze({ year: anchorYear, month: anchorMonth, day: nonesDay });

		const effectiveCount = (relation === 'pridie')
			? 2
			: count;
		return Object.freeze({
			year: anchorYear,
			month: anchorMonth,
			day: nonesDay - effectiveCount + 1,
		});
	}

	// anchor === 'Ides'
	const idesDay = getIdesDay(anchorMonth);
	if (relation === 'on')
		return Object.freeze({ year: anchorYear, month: anchorMonth, day: idesDay });

	const effectiveCount = (relation === 'pridie')
		? 2
		: count;
	return Object.freeze({
		year: anchorYear,
		month: anchorMonth,
		day: idesDay - effectiveCount + 1,
	});
}
