import type { Tempo } from '@magmacomputing/tempo';

/**
 * The three traditional lunar anchor points of the Roman month.
 */
export type RomanAnchor = 'Kalends' | 'Nones' | 'Ides';

/**
 * Grammatical position relative to a Roman anchor point.
 * - `'on'`: Exactly on the anchor day (Ablative case, e.g. *Idibus Martiis*).
 * - `'pridie'`: The day immediately before the anchor (e.g. *Pridie Idus Octobres*).
 * - `'ante_diem'`: Counting inclusively backwards from the anchor (e.g. *ante diem XVII Kalendas Novembres*).
 */
export type RomanDateRelation = 'on' | 'pridie' | 'ante_diem';

/**
 * Grammatical case for Latin date output.
 */
export type RomanGrammaticalCase = 'nominative' | 'accusative' | 'ablative';

/**
 * Options for classical Roman calendar calculations.
 */
export interface RomanCalculationOptions {
	/**
	 * Whether to use proleptic Julian calendar leap rules (every 4 years without century exceptions)
	 * or standard Gregorian rules.
	 *
	 * @default false (uses host environment / Gregorian rules)
	 */
	isJulian?: boolean;

	/**
	 * Whether to enable the classical bissextile leap day (*ante diem bis sextum Kalendas Martias*)
	 * on February 24 in leap years. When false, February is treated as standard 29-day countdown.
	 *
	 * @default true
	 */
	bissextile?: boolean;
}

/**
 * A structured representation of a classical Roman calendar date.
 */
export interface ClassicalRomanDate {
	/**
	 * The applicable lunar anchor (Kalends, Nones, or Ides).
	 */
	anchor: RomanAnchor;

	/**
	 * The month (1–12) whose anchor is referenced.
	 * For dates after the Ides, this refers to the following month (e.g. October 16 references November Kalends).
	 */
	anchorMonth: number;

	/**
	 * The astronomical year of the referenced anchor.
	 * For dates in December after the Ides, this advances to the following year.
	 */
	anchorYear: number;

	/**
	 * Position relative to the anchor: `'on'`, `'pridie'`, or `'ante_diem'`.
	 */
	relation: RomanDateRelation;

	/**
	 * Inclusive countdown integer to the anchor.
	 * - 1 for `'on'`
	 * - 2 for `'pridie'`
	 * - 3–19 for `'ante_diem'`
	 */
	count: number;

	/**
	 * Roman numeral representation of the countdown integer (e.g. `'XVII'`, `'IV'`), or empty string if on the anchor.
	 */
	romanNumeral: string;

	/**
	 * Whether this date is the intercalated bissextile leap day (*ante diem bis sextum Kalendas Martias*, Feb 24 in leap years).
	 */
	isBissextile: boolean;

	/**
	 * Day of the month in the modern calendar (1–31).
	 */
	day: number;

	/**
	 * Month of the modern calendar (1–12).
	 */
	month: number;

	/**
	 * Astronomical year (e.g. 2026, 0 for 1 BCE, -43 for 44 BCE).
	 */
	year: number;

	/**
	 * Year reckoned Ab Urbe Condita (AUC, founded 753 BCE).
	 */
	auc: number;

	/**
	 * Full Latin phrasing (e.g. `"ante diem XVII Kalendas Novembres"`, `"Idibus Martiis"`).
	 */
	latin: string;

	/**
	 * Standard Latin abbreviation (e.g. `"a.d. XVII Kal. Nov."`, `"Id. Mart."`).
	 */
	shortLatin: string;
}

/**
 * Static namespace exposed on `Tempo.roman`.
 */
export interface RomanNamespace {
	/**
	 * Calculates the classical Roman date representation for a given date, Tempo instance, or object.
	 */
	toClassical(
		date: Tempo | Date | { year: number; month: number; day: number },
		options?: RomanCalculationOptions,
	): ClassicalRomanDate;

	/**
	 * Converts an astronomical or historical year into an Ab Urbe Condita (AUC) year.
	 *
	 * @param year - Astronomical year (e.g. 2026, 0 for 1 BCE, -43 for 44 BCE) or positive BCE year when era is specified.
	 * @param era - Optional era indicator (`'CE'` or `'BCE'`).
	 * @returns The year in AUC reckoning.
	 */
	yearToAuc(year: number, era?: 'CE' | 'BCE'): number;

	/**
	 * Converts an Ab Urbe Condita (AUC) year into an astronomical or historical year.
	 *
	 * @param auc - AUC year number (e.g. 2779 AUC).
	 * @param format - `'astronomical'` (default) or `'historical'` (`{ year, era }`).
	 */
	aucToYear(auc: number, format?: 'astronomical'): number;
	aucToYear(auc: number, format: 'historical'): { year: number; era: 'CE' | 'BCE' };
	aucToYear(auc: number, format?: 'astronomical' | 'historical'): number | { year: number; era: 'CE' | 'BCE' };

	/**
	 * Returns the day of the month for the Nones in a given month (7 for March, May, July, October; 5 otherwise).
	 */
	getNonesDay(month: number): number;

	/**
	 * Returns the day of the month for the Ides in a given month (15 for March, May, July, October; 13 otherwise).
	 */
	getIdesDay(month: number): number;

	/**
	 * Evaluates whether a year is a leap year under Julian or Gregorian reckoning.
	 */
	isLeapYear(year: number, isJulian?: boolean): boolean;

	/**
	 * Resolves a classical Roman date structure back into calendar year, month, and day.
	 */
	fromClassical(
		anchor: RomanAnchor,
		anchorMonth: number,
		anchorYear: number,
		relation: RomanDateRelation,
		count?: number,
		isBissextile?: boolean,
		isJulian?: boolean,
	): { year: number; month: number; day: number };
}
