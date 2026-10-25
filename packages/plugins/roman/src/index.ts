import { definePlugin, deepFreeze, isFunction, isNumber, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import { isLeapYear } from '@magmacomputing/tempo/library';
import type { Tempo } from '@magmacomputing/tempo';
import type {
	ClassicalRomanDate,
	RomanAnchor,
	RomanCalculationOptions,
	RomanDateRelation,
	RomanFormatOptions,
	RomanNamespace,
	RomanParseOptions,
} from './types.js';
import {
	aucToYear,
	calculateClassicalRomanDate,
	calculateGregorianFromRoman,
	getIdesDay,
	getNonesDay,
	yearToAuc,
} from './math.js';
import { createRomanTokenEvaluator, formatClassicalRomanDate } from './format.js';
import { parseClassicalRomanDate } from './parser.js';
import {
	findConsulYears,
	formatConsuls,
	getConsulsByYear,
	registerConsuls,
	LANDMARK_CONSULS,
} from './consul-engine.js';

export * from './types.js';
export * from './constants.js';
export * from './math.js';
export * from './format.js';
export * from './parser.js';
export * from './consul-engine.js';

declare module '@magmacomputing/tempo' {
	/** Registers `{roman}` (and `{roman:...}` modifiers) for compile-time format validation. */
	interface TempoFormatTokens {
		roman: true;
	}

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

		/**
		 * Formats this instance using classical Roman calendar conventions and Latin declensions.
		 *
		 * @param options - Formatting configuration (case, style, AUC, words, casing)
		 * @returns Formatted classical Roman date string
		 * @example
		 * ```ts
		 * const t = new Tempo('2026-10-16');
		 * console.log(t.formatRoman({ case: 'nominative' }));
		 * console.log(t.format('{roman:classical}')); // "ante diem XVII Kalendas Novembres"
		 * console.log(t.format('{roman:short}'));     // "a.d. XVII Kal. Nov."
		 * console.log(t.format('{roman:auc}'));       // "AUC MMDCCLXXIX"
		 * ```
		 */
		formatRoman(options?: RomanFormatOptions): string;

		/**
		 * Structured Classical Roman calendar date.
		 */
		readonly roman: ClassicalRomanDate;

		/**
		 * Formatted classical Roman consular dating formula (e.g. `"M. Tullio Cicerone, C. Antonio Hybrida coss."`),
		 * or undefined if no ordinary consuls are recorded in the Fasti for this year.
		 */
		readonly consuls?: string;
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
function createRomanNamespace(TempoClass: any): RomanNamespace {
	return {
		parse(input: string, options?: RomanParseOptions): Tempo {
			const { year, month, day } = parseClassicalRomanDate(input, options);
			return new TempoClass({ year, month, day });
		},

		parseDate(input: string, options?: RomanParseOptions) {
			return parseClassicalRomanDate(input, options);
		},
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
			bissextile: boolean = true,
		): { year: number; month: number; day: number } {
			return calculateGregorianFromRoman(
				anchor,
				anchorMonth,
				anchorYear,
				relation,
				count,
				isBissextile,
				isJulian,
				bissextile,
			);
		},

		format(
			date: Tempo | Date | { year: number; month: number; day: number },
			options?: RomanFormatOptions,
		): string {
			const { year, month, day } = extractDateComponents(date);
			const roman = calculateClassicalRomanDate(year, month, day, options);
			return formatClassicalRomanDate(roman, options);
		},

		getConsuls(year: number): readonly string[] | undefined {
			return getConsulsByYear(year);
		},

		formatConsuls(year: number, style?: any): string | undefined {
			return formatConsuls(year, style);
		},

		findConsuls(query: string) {
			return findConsulYears(query);
		},

		registerConsuls(catalog: Record<number, readonly string[]>): void {
			registerConsuls(catalog);
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
		const romanNamespace = createRomanNamespace(TempoClass);

		// 1. Mount static Tempo.roman namespace
		Object.defineProperty(TempoClass, 'roman', {
			value: deepFreeze(romanNamespace),
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

		if (!TempoClass.prototype.formatRoman) {
			TempoClass.prototype.formatRoman = function (
				this: Tempo,
				options?: RomanFormatOptions,
			): string {
				const { year, month, day } = extractDateComponents(this);
				const roman = calculateClassicalRomanDate(year, month, day, options);
				return formatClassicalRomanDate(roman, options);
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

		if (!Object.getOwnPropertyDescriptor(TempoClass.prototype, 'roman')) {
			Object.defineProperty(TempoClass.prototype, 'roman', {
				get(this: Tempo): ClassicalRomanDate {
					const { year, month, day } = extractDateComponents(this);
					return calculateClassicalRomanDate(year, month, day);
				},
				configurable: true,
				enumerable: false,
			});
		}

		if (!Object.getOwnPropertyDescriptor(TempoClass.prototype, 'consuls')) {
			Object.defineProperty(TempoClass.prototype, 'consuls', {
				get(this: Tempo): string | undefined {
					const { year } = extractDateComponents(this);
					return formatConsuls(year);
				},
				configurable: true,
				enumerable: false,
			});
		}

		// 3. Register custom {roman:...} format token evaluator
		const tokenEvaluator = createRomanTokenEvaluator((y, m, d) => calculateClassicalRomanDate(y, m, d));
		TempoClass.use({
			registry: {
				tokens: {
					roman: tokenEvaluator,
				},
			},
		});
	},
});

export default RomanPlugin;

