import { evaluate } from '@magmacomputing/tempo/library';
import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import { formatLdml, parseLdml } from '../compiler/ldml.compiler.js';
import { formatStrftime, parseStrftime } from '../compiler/strftime.compiler.js';
import { formatOracle, parseOracle } from '../compiler/oracle.compiler.js';
import { formatPhp, parsePhp } from '../compiler/php.compiler.js';
import { formatGo, parseGo } from '../compiler/go.compiler.js';

import { type ParseOptions as DialectOptions } from '../compiler/shared.compiler.js';

const ORACLE_DETECTION_REGEX = /\bhh(?:24|12)\b/i;
const ORACLE_UPPER_REGEX = /\b(?:MI|SSSSS|FF[1-9]?)\b/;
const GO_DETECTION_REGEX = /\b2006\b|\b15:04\b|Z07:00|-07:00/;

/**
 * Detects the dialect from a format mask string if not explicitly supplied.
 */
export function detectDialect(mask: string, explicitDialect?: any): Dialect {
	const resolved = evaluate(explicitDialect);
	if (resolved) return normalizeDialect(String(resolved));
	if (mask.includes('%')) return DIALECT.Strftime;
	if (GO_DETECTION_REGEX.test(mask)) return DIALECT.Go;

	return (ORACLE_DETECTION_REGEX.test(mask) || ORACLE_UPPER_REGEX.test(mask))
		? DIALECT.Oracle
		: DIALECT.Ldml;
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
		case DIALECT.Oracle:
			return formatOracle(zdt, mask);
		case DIALECT.Strftime:
			return formatStrftime(zdt, mask);
		case DIALECT.Moment:
			return formatLdml(zdt, translateMomentToLdml(mask));
		case DIALECT.Php:
			return formatPhp(zdt, mask);
		case DIALECT.Go:
			return formatGo(zdt, mask);
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
		case DIALECT.Oracle:
			return parseOracle(input, mask, options);
		case DIALECT.Strftime:
			return parseStrftime(input, mask, options);
		case DIALECT.Moment:
			return parseLdml(input, translateMomentToLdml(mask), options);
		case DIALECT.Php:
			return parsePhp(input, mask, options);
		case DIALECT.Go:
			return parseGo(input, mask, options);
		case DIALECT.Ldml:
		default:
			return parseLdml(input, mask, options);
	}
}
