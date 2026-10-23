import { definePlugin, deepFreeze, isFunction, isNumber, isLeapYear, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';
import type {
	ClassicalRomanDate,
	RomanAnchor,
	RomanCalculationOptions,
	RomanDateRelation,
	RomanNamespace,
} from './types.js';
import {
	aucToYear,
	calculateClassicalRomanDate,
	calculateGregorianFromRoman,
	getIdesDay,
	getNonesDay,
	yearToAuc,
} from './math.js';

export * from './types.js';
export * from './constants.js';
export * from './math.js';

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		/**
		 * Classical Roman calendar and Ab Urbe Condita (AUC) namespace.
		 */
		const roman: RomanNamespace;
	}

	interface Tempo {
		/**
		 * Computes the classical Roman calendar date representation (Kalends, Nones, Ides, Ante Diem).
		 *
		 * @param options - Calculation options (Julian leap rules, bissextile leap day)
		 * @returns Classical Roman date structure including Latin phrases and AUC year
		 * @example
		 * ```ts
		 * const t = new Tempo('2026-10-16');
		 * const roman = t.toRomanClassical();
		 * console.log(roman.latin); // "ante diem XVII Kalendas Novembres"
		 * ```
		 */
		toRomanClassical(options?: RomanCalculationOptions): ClassicalRomanDate;

		/**
		 * Returns the year reckoned Ab Urbe Condita (AUC) from the traditional founding of Rome in 753 BCE.
		 *
		 * @returns The year in AUC
		 * @example
		 * ```ts
		 * const t = new Tempo('2026-10-16');
		 * console.log(t.toAUC()); // 2779
		 * ```
		 */
		toAUC(): number;

		/**
		 * Year reckoned Ab Urbe Condita (AUC).
		 */
		readonly auc: number;
	}
}

/**
 * @internal
 * Safely extracts calendar year, month, and day components from Tempo, Date, or plain objects.
 */
function extractDateComponents(date: any): { year: number; month: number; day: number } {
	if (!date)
		throw new TypeError('Invalid date input provided to Tempo.roman');

	if (isNumber(date.yy) && isNumber(date.mm) && isNumber(date.dd))
		return { year: date.yy, month: date.mm, day: date.dd };

	if (isNumber(date.year) && isNumber(date.month) && isNumber(date.day))
		return { year: date.year, month: date.month, day: date.day };

	if (date instanceof Date)
		return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };

	if (isFunction(date.toDateTime)) {
		const dt = date.toDateTime();
		return { year: dt.year, month: dt.month, day: dt.day };
	}

	throw new TypeError('Invalid date input provided to Tempo.roman');
}

/**
 * Creates the static RomanNamespace implementation.
 */
function createRomanNamespace(): RomanNamespace {
	return {
		toClassical(
			date: Tempo | Date | { year: number; month: number; day: number },
			options?: RomanCalculationOptions,
		): ClassicalRomanDate {
			const { year, month, day } = extractDateComponents(date);
			return calculateClassicalRomanDate(year, month, day, options);
		},

		yearToAuc(year: number, era?: 'CE' | 'BCE'): number {
			return yearToAuc(year, era);
		},

		aucToYear(
			auc: number,
			format: 'astronomical' | 'historical' = 'astronomical',
		): any {
			return aucToYear(auc, format as any);
		},

		getNonesDay(month: number): number {
			return getNonesDay(month);
		},

		getIdesDay(month: number): number {
			return getIdesDay(month);
		},

		isLeapYear(year: number, isJulian?: boolean): boolean {
			return isLeapYear(year, isJulian);
		},

		fromClassical(
			anchor: RomanAnchor,
			anchorMonth: number,
			anchorYear: number,
			relation: RomanDateRelation,
			count: number = 1,
			isBissextile: boolean = false,
			isJulian: boolean = false,
		): { year: number; month: number; day: number } {
			return calculateGregorianFromRoman(
				anchor,
				anchorMonth,
				anchorYear,
				relation,
				count,
				isBissextile,
				isJulian,
			);
		},
	};
}

/**
 * ## RomanPlugin
 * Tempo Community Plugin providing classical Roman calendar arithmetic and AUC conversions.
 */
export const RomanPlugin: TempoPlugin = definePlugin({
	name: 'roman',
	install(TempoClass: any): void {
		const romanNamespace = createRomanNamespace();

		// 1. Mount static Tempo.roman namespace
		Object.defineProperty(TempoClass, 'roman', {
			value: deepFreeze ? deepFreeze(romanNamespace) : Object.freeze(romanNamespace),
			writable: false,
			configurable: true,
			enumerable: false,
		});

		// 2. Mount instance methods onto Tempo.prototype
		if (!TempoClass.prototype.toRomanClassical) {
			TempoClass.prototype.toRomanClassical = function (
				this: Tempo,
				options?: RomanCalculationOptions,
			): ClassicalRomanDate {
				const { year, month, day } = extractDateComponents(this);
				return calculateClassicalRomanDate(year, month, day, options);
			};
		}

		if (!TempoClass.prototype.toAUC) {
			TempoClass.prototype.toAUC = function (this: Tempo): number {
				const { year } = extractDateComponents(this);
				return yearToAuc(year);
			};
		}

		if (!Object.getOwnPropertyDescriptor(TempoClass.prototype, 'auc')) {
			Object.defineProperty(TempoClass.prototype, 'auc', {
				get(this: Tempo): number {
					const { year } = extractDateComponents(this);
					return yearToAuc(year);
				},
				configurable: true,
				enumerable: false,
			});
		}
	},
});

export default RomanPlugin;

