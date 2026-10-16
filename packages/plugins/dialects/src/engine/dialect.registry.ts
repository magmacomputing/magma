import { evaluate } from '@magmacomputing/tempo/library';
import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import { formatLdml, parseLdml } from '../compiler/ldml.compiler.js';
import { formatStrftime, parseStrftime } from '../compiler/strftime.compiler.js';
import { formatOracle, parseOracle } from '../compiler/oracle.compiler.js';
import { formatPhp, parsePhp } from '../compiler/php.compiler.js';
import { formatGo, parseGo } from '../compiler/go.compiler.js';

import { type ParseOptions as DialectOptions } from '../compiler/shared.compiler.js';

const RE_ORACLE_DETECTION = /\bhh(?:24|12)\b/i;
const RE_ORACLE_UPPER = /\b(?:MI|SSSSS|FF[1-9]?|MON)\b/;
const RE_LDML_CONFLICT = /\b(?:yyyy|YYYY|HH|mm|ss)\b/;
const RE_GO_DETECTION = /\b2006\b.*(?:\b(?:01|02|15:04|0?3:04|Jan|MST)\b)|(?:\b(?:01|02|15:04|0?3:04|Jan|MST)\b).*\b2006\b|\b(?:0[12][/-]0[12][/-]06|06[/-]0[12][/-]0[12])\b|\b(?:15|0?3):04(?::05)?\b/;
const RE_QUOTED_LITERALS = /'(''|[^'])*'/g;
const RE_STRFTIME_SPECIFIERS = /%(-)?([1-9])?[%aAbBcdDeEfFGghHIjklmMpPRsSTuUVwWyYzZ]/;

/**
 * Detects the dialect from a format mask string if not explicitly supplied.
 */
export function detectDialect(mask: string, explicitDialect?: any): Dialect {
	const resolved = evaluate(explicitDialect);
	if (resolved) return normalizeDialect(resolved);
	// Strip single-quoted string literals to prevent quoted text in LDML from triggering false positives
	const clean = mask.replace(RE_QUOTED_LITERALS, '');

	if (RE_STRFTIME_SPECIFIERS.test(clean)) return DIALECT.Strftime;
	if (!RE_LDML_CONFLICT.test(clean) && RE_GO_DETECTION.test(clean)) return DIALECT.Go;
	if (RE_ORACLE_DETECTION.test(clean) || RE_ORACLE_UPPER.test(clean)) return DIALECT.Oracle;

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
