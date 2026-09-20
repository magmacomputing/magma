import { evaluate } from '@magmacomputing/tempo/library';
import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import { formatLdml, parseLdml } from './ldml.compiler.js';
import { formatStrftime, parseStrftime } from './strftime.compiler.js';

export interface DialectOptions {
	dialect?: any;
	timeZone?: any;
	calendar?: any;
	today?: Temporal.ZonedDateTime | undefined;
	[key: string]: any;
}

/**
 * Detects the dialect from a format mask string if not explicitly supplied.
 */
export function detectDialect(mask: string, explicitDialect?: any): Dialect {
	const resolved = evaluate(explicitDialect);
	if (resolved) return normalizeDialect(String(resolved));
	if (mask.includes('%')) return DIALECT.Strftime;
	return DIALECT.Ldml;
}

/**
 * Translates a Moment.js format mask into standard LDML.
 */
export function translateMomentToLdml(mask: string): string {
	let out = '';
	let i = 0;
	while (i < mask.length) {
		if (mask[i] === '[') {
			const close = mask.indexOf(']', i);
			if (close !== -1) {
				const literal = mask.slice(i + 1, close).replace(/'/g, "''");
				out += `'${literal}'`;
				i = close + 1;
				continue;
			}
		}
		if (mask.startsWith('YYYY', i)) { out += 'yyyy'; i += 4; }
		else if (mask.startsWith('YY', i)) { out += 'yy'; i += 2; }
		else if (mask.startsWith('Do', i)) { out += 'Do'; i += 2; }
		else if (mask.startsWith('DD', i)) { out += 'dd'; i += 2; }
		else if (mask.startsWith('D', i)) { out += 'd'; i += 1; }
		else if (mask.startsWith('dddd', i)) { out += 'EEEE'; i += 4; }
		else if (mask.startsWith('ddd', i)) { out += 'EEE'; i += 3; }
		else if (mask.startsWith('A', i)) { out += 'aa'; i += 1; }
		else if (mask.startsWith('a', i)) { out += 'a'; i += 1; }
		else {
			out += mask[i];
			i++;
		}
	}
	return out;
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
			return formatLdml(zdt, translateMomentToLdml(mask));
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
			return parseLdml(input, translateMomentToLdml(mask), options);
		case DIALECT.Ldml:
		default:
			return parseLdml(input, mask, options);
	}
}
