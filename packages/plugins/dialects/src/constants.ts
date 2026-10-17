import { enumify, Enum } from '@magmacomputing/tempo/library';
import type { ValueOf, KeyOf } from '@magmacomputing/tempo/library';

/**
 * ## DIALECT
 * Canonical date formatting and parsing dialect identifiers.
 */
export const DIALECT: Enum.wrap<{
	Ldml: 'ldml';
	Strftime: 'strftime';
	Moment: 'moment';
	Oracle: 'oracle';
	Php: 'php';
	Go: 'go';
}> = enumify({
	Ldml: 'ldml',
	Strftime: 'strftime',
	Moment: 'moment',
	Oracle: 'oracle',
	Php: 'php',
	Go: 'go',
});

export type Dialect = ValueOf<typeof DIALECT>;

/**
 * ## DIALECT_ALIAS
 * Common ecosystem aliases mapped to canonical dialect identifiers.
 */
export const DIALECT_ALIAS: Enum.wrap<{
	luxon: 'ldml';
	datefns: 'ldml';
	cldr: 'ldml';
	posix: 'strftime';
	c: 'strftime';
	python: 'strftime';
	dayjs: 'moment';
	sql: 'oracle';
	postgres: 'oracle';
	postgresql: 'oracle';
	snowflake: 'oracle';
	redshift: 'oracle';
	to_char: 'oracle';
	tochar: 'oracle';
	laravel: 'php';
	wordpress: 'php';
	golang: 'go';
}> = enumify({
	luxon: 'ldml',
	datefns: 'ldml',
	cldr: 'ldml',
	posix: 'strftime',
	c: 'strftime',
	python: 'strftime',
	dayjs: 'moment',
	sql: 'oracle',
	postgres: 'oracle',
	postgresql: 'oracle',
	snowflake: 'oracle',
	redshift: 'oracle',
	to_char: 'oracle',
	tochar: 'oracle',
	laravel: 'php',
	wordpress: 'php',
	golang: 'go',
});

export type DialectAlias = KeyOf<typeof DIALECT_ALIAS>;

/**
 * Normalizes a dialect name or alias to its canonical dialect identifier.
 * Ignores surrounding whitespace and case; missing or unrecognized names resolve to LDML.
 */
export function normalizeDialect(input?: string): Dialect {
	if (!input) return DIALECT.Ldml;
	const trimmed = String(input).trim() as KeyOf<typeof DIALECT>;
	const lower = trimmed.toLowerCase() as KeyOf<typeof DIALECT_ALIAS>;

	if (Enum.has(DIALECT_ALIAS, lower))
		return DIALECT_ALIAS[lower] as Dialect;

	if (Enum.includes(DIALECT, lower))
		return lower as Dialect;

	return Enum.has(DIALECT, trimmed)
		? DIALECT[trimmed]
		: DIALECT.Ldml;
}
