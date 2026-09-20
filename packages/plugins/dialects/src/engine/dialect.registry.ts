import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import { formatLdml, parseLdml } from './ldml.compiler.js';
import { formatStrftime, parseStrftime } from './strftime.compiler.js';

export interface DialectOptions {
	dialect?: string | undefined;
	timeZone?: any;
	calendar?: any;
	today?: Temporal.ZonedDateTime | undefined;
	[key: string]: any;
}

/**
 * Detects the dialect from a format mask string if not explicitly supplied.
 */
export function detectDialect(mask: string, explicitDialect?: string): Dialect {
	if (explicitDialect) return normalizeDialect(explicitDialect);
	if (mask.includes('%')) return DIALECT.Strftime;
	return DIALECT.Ldml;
}

/**
 * Formats a date using the appropriate dialect compiler.
 */
export function formatWithDialect(
	zdt: Temporal.ZonedDateTime,
	mask: string,
	options: DialectOptions = {}
): string {
	const dialect = detectDialect(mask, options.dialect);
	switch (dialect) {
		case DIALECT.Strftime:
			return formatStrftime(zdt, mask);
		case DIALECT.Moment:
		case DIALECT.Ldml:
		default:
			return formatLdml(zdt, mask);
	}
}

/**
 * Parses an input string with a dialect mask.
 */
export function parseWithDialect(
	input: string,
	mask: string,
	options: DialectOptions = {}
): Temporal.ZonedDateTime | undefined {
	const dialect = detectDialect(mask, options.dialect);
	switch (dialect) {
		case DIALECT.Strftime:
			return parseStrftime(input, mask, options);
		case DIALECT.Moment:
		case DIALECT.Ldml:
		default:
			return parseLdml(input, mask, options);
	}
}
