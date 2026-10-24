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
 * - `'customary'`: The standard historical phrasing (Ablative on anchor, Accusative with ante diem/pridie).
 * - `'nominative'`: Nominative case (e.g. *Kalendae Januariae*).
 * - `'accusative'`: Accusative case (e.g. *Kalendas Januarias*).
 * - `'ablative'`: Ablative case (e.g. *Kalendis Januariis*).
 */
export type RomanGrammaticalCase = 'customary' | 'nominative' | 'accusative' | 'ablative';

/**
 * Visual format style for classical Roman date strings.
 * - `'classical'`: Full Latin words (e.g. `"ante diem XVII Kalendas Novembres"`).
 * - `'short'`: Standard Latin epigraphical abbreviations (e.g. `"a.d. XVII Kal. Nov."`).
 */
export type RomanFormatStyle = 'classical' | 'short';

/**
 * Visual format style for consular dates.
 * - `'ablative'`: Latin ablative absolute formula (e.g. `"M. Tullio Cicerone, C. Antonio Hybrida coss."`)
 * - `'nominative'`: Nominative consul names (e.g. `"M. Tullius Cicero, C. Antonius Hybrida"`)
 */
export type ConsularFormatStyle = 'ablative' | 'nominative';

/**
 * Matched Roman consular entry for a given year.
 */
export interface ConsularPair {
	/** Astronomical year (0 = 1 BCE, -62 = 63 BCE). */
	year: number;
	/** Array of consul names for this year. */
	consuls: readonly string[];
	/** Classical Latin ablative dating formula. */
	formatted: string;
}

/**
 * Options for formatting classical Roman dates.
 */
export interface RomanFormatOptions extends RomanCalculationOptions {
	/**
	 * Grammatical case for Latin output.
	 *
	 * @default 'customary'
	 */
	case?: RomanGrammaticalCase;

	/**
	 * Output style: `'classical'` (full words) or `'short'` (standard abbreviations).
	 *
	 * @default 'classical'
	 */
	style?: RomanFormatStyle;

	/**
	 * Whether to spell out the countdown numeral as Latin words (e.g. "tertium decimum")
	 * instead of Roman numerals ("XIII").
	 *
	 * @default false
	 */
	words?: boolean;

	/**
	 * Whether to append the AUC (Ab Urbe Condita) year to the formatted output.
	 *
	 * @default false
	 */
	auc?: boolean;

	/**
	 * AUC formatting style: `'roman'` (e.g. "AUC MMDCCLXXIX") or `'numeric'` (e.g. "AUC 2779").
	 *
	 * @default 'roman'
	 */
	aucFormat?: 'roman' | 'numeric';

	/**
	 * Text casing transformation.
	 *
	 * @default 'preserve'
	 */
	casing?: 'preserve' | 'upper' | 'lower' | 'capitalize';

	/**
	 * Consular dating format style when rendering consuls.
	 *
	 * @default 'ablative'
	 */
	consulStyle?: ConsularFormatStyle;
}

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
 * Options for parsing classical Latin date expressions.
 */
export interface RomanParseOptions extends RomanCalculationOptions {
	/**
	 * Astronomical year to use when the expression does not state one
	 * (e.g. `"Idibus Martiis"`).
	 */
	year?: number;
}

/**
 * The result of parsing a classical Latin date expression.
 */
export interface ParsedRomanDate {
	/** Astronomical year (0 for 1 BCE, -43 for 44 BCE). */
	year: number;
	/** Month of the modern calendar (1–12). */
	month: number;
	/** Day of the month in the modern calendar (1–31). */
	day: number;
	/** Year reckoned Ab Urbe Condita. */
	auc: number;
	/** The canonical classical representation of the resolved date. */
	classical: ClassicalRomanDate;
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

	/**
	 * Full Latin phrasing in the Nominative case (e.g. `"Kalendae Januariae"`, `"Idus Martiae"`).
	 */
	nominative: string;

	/**
	 * Full Latin phrasing in the Accusative case (e.g. `"Kalendas Januarias"`, `"ante diem XVII Kalendas Novembres"`).
	 */
	accusative: string;

	/**
	 * Full Latin phrasing in the Ablative case (e.g. `"Kalendis Januariis"`, `"Idibus Martiis"`).
	 */
	ablative: string;

	/**
	 * Formats this classical date according to specified options.
	 */
	format(options?: RomanFormatOptions): string;
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
	 * Formats a date using classical Roman calendar conventions and format options.
	 */
	format(
		date: Tempo | Date | { year: number; month: number; day: number },
		options?: RomanFormatOptions,
	): string;

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
	 * Parses a classical Latin date expression (e.g. `'a.d. IV Id. Mart. 710 AUC'`) into a Tempo instance.
	 *
	 * @throws {RangeError} if the expression is not a recognisable, real date
	 */
	parse(input: string, options?: RomanParseOptions): Tempo;

	/**
	 * Parses a classical Latin date expression into its calendar components without creating a Tempo.
	 *
	 * @throws {RangeError} if the expression is not a recognisable, real date
	 */
	parseDate(input: string, options?: RomanParseOptions): ParsedRomanDate;

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

	/**
	 * Retrieves the list of eponymous Roman consuls for an astronomical year from the Fasti (509 BCE–541 CE).
	 *
	 * @param year - Astronomical year (0 = 1 BCE, -62 = 63 BCE, 541 = 541 CE)
	 * @returns Array of consul names, or undefined if no ordinary consuls are recorded
	 */
	getConsuls(year: number): readonly string[] | undefined;

	/**
	 * Formats the eponymous Roman consuls of an astronomical year into a classical Latin dating formula.
	 *
	 * @param year - Astronomical year
	 * @param style - `'ablative'` (default, e.g. `"Cicerone et Antonio coss."`) or `'nominative'`
	 * @returns Formatted formula or undefined if no entry exists
	 */
	formatConsuls(year: number, style?: ConsularFormatStyle): string | undefined;

	/**
	 * Searches the Fasti consulares for matching consul names.
	 *
	 * @param query - Case-insensitive name substring
	 * @returns List of matching years and consul pairs
	 */
	findConsuls(query: string): ConsularPair[];

	/**
	 * Registers an external consular catalog into the active catalog.
	 *
	 * @param catalog - Mapping of astronomical years to arrays of consul names
	 */
	registerConsuls(catalog: Record<number, readonly string[]>): void;
}
