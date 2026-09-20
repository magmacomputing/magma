import { enumify } from '@magmacomputing/tempo/library';
import type { ValueOf, KeyOf, Enum } from '@magmacomputing/tempo/library';

/**
 * ## DIALECT
 * Canonical date formatting and parsing dialect identifiers.
 */
export const DIALECT: Enum.wrap<{
	Ldml: 'ldml';
	Strftime: 'strftime';
	Moment: 'moment';
}> = enumify({
	Ldml: 'ldml',
	Strftime: 'strftime',
	Moment: 'moment',
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
}> = enumify({
	luxon: 'ldml',
	datefns: 'ldml',
	cldr: 'ldml',
	posix: 'strftime',
	c: 'strftime',
	python: 'strftime',
	dayjs: 'moment',
});

export type DialectAlias = KeyOf<typeof DIALECT_ALIAS>;

/**
 * Normalizes a dialect name or alias to its canonical dialect identifier.
 */
export function normalizeDialect(input?: string): Dialect {
	if (!input) return DIALECT.Ldml;
	const lower = input.trim().toLowerCase();
	if (DIALECT_ALIAS.has(lower as any))
		return (DIALECT_ALIAS as any)[lower] as Dialect;

	if (DIALECT.includes(lower as any))
		return lower as Dialect;

	if (DIALECT.has(input.trim() as any))
		return (DIALECT as any)[input.trim()] as Dialect;

	return DIALECT.Ldml;
}
