import { evaluate, hasKey, isObject, isUndefined } from '@magmacomputing/tempo/library';
import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import { formatLdml, parseLdml } from '../compiler/ldml.compiler.js';
import { formatStrftime, parseStrftime } from '../compiler/strftime.compiler.js';
import { formatOracle, parseOracle } from '../compiler/oracle.compiler.js';
import { formatPhp, parsePhp } from '../compiler/php.compiler.js';
import { formatGo, parseGo } from '../compiler/go.compiler.js';

import type { DialectOptions } from '../compiler/shared.compiler.js';

const RE_ORACLE_DETECTION = /\bhh(?:24|12)\b/i;
const RE_ORACLE_UPPER = /\b(?:MI|FF[1-9]?|MON)\b/;
const RE_LDML_CONFLICT = /\b(?:yyyy|mm|ss)\b/;
const RE_GO_DETECTION = /\b2006\b.*(?:\b(?:01|02|15:04|0?3:04|Jan|MST)\b)|(?:\b(?:01|02|15:04|0?3:04|Jan|MST)\b).*\b2006\b|\b(?:0[12][/-]0[12][/-]06|06[/-]0[12][/-]0[12])\b|\b(?:15|0?3):04(?::05)?\b|\b2006[/-]0?1[/-]0?2\b/;
const RE_QUOTED_LITERALS = /'(''|[^'])*'/g;
const RE_STRFTIME_SPECIFIERS = /%(-)?([1-9])?[%aAbBcdDeEfFGghHIjklmMpPRsSTuUVwWyYzZ]/;

/**
 * Detects the dialect from a format mask string if not explicitly supplied.
 * Checks strftime, Go, then Oracle heuristics outside single-quoted literals, falling back to LDML.
 * PHP and Moment require an explicit dialect.
 *
 * @param dialectOrOptions - A dialect name or zero-argument supplier, or an object with a `dialect` value
 * @throws Errors from evaluating a dialect supplier propagate to the caller.
 */
export function detectDialect(mask: string, dialectOrOptions?: any): Dialect {
	const raw = isObject(dialectOrOptions)
		? (hasKey(dialectOrOptions, 'dialect') ? dialectOrOptions.dialect : undefined)
		: dialectOrOptions;
	const resolved = evaluate(raw);
	if (resolved) return normalizeDialect(resolved);
	// Strip single-quoted string literals to prevent quoted text in LDML from triggering false positives
	const clean = mask.replace(RE_QUOTED_LITERALS, '');

	if (RE_STRFTIME_SPECIFIERS.test(clean)) return DIALECT.Strftime;
	if (!RE_LDML_CONFLICT.test(clean) && RE_GO_DETECTION.test(clean)) return DIALECT.Go;
	if (RE_ORACLE_DETECTION.test(clean) || (!RE_LDML_CONFLICT.test(clean) && RE_ORACLE_UPPER.test(clean))) return DIALECT.Oracle;

	return DIALECT.Ldml;
}

const MOMENT_TO_LDML_MAP: Readonly<Record<string, string>> = {
	YYYY: 'yyyy',
	GGGG: 'YYYY',
	YY: 'yy',
	GG: 'YY',
	DDDD: 'DDD',
	DDDo: 'DDDo',
	DDD: 'D',
	Do: 'Do',
	DD: 'dd',
	D: 'd',
	dddd: 'EEEE',
	ddd: 'EEE',
	WW: 'ww',
	W: 'w',
	ZZ: 'ZZ',
	Z: 'ZZZZZ',
	E: 'e',
	A: 'aa',
	a: 'a',
};

const RE_MOMENT_TRANSLATE =
	/\[([^\]]+)\]|(YYYY|GGGG|YY|GG|DDDD|DDDo|DDD|Do|DD|D|dddd|ddd|WW|W|ZZ|Z|E|A|a)/g;

/**
 * Translates a Moment.js format mask into standard LDML.
 */
export function translateMomentToLdml(mask: string): string {
	return mask.replace(RE_MOMENT_TRANSLATE, (match, literal, token) => {
		return (!isUndefined(literal))
			? `'${literal.replace(/'/g, "''")}'`
			: MOMENT_TO_LDML_MAP[token] ?? match;
	});
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
 * Parses an input string with a dialect mask, detecting the dialect when omitted.
 * Returns undefined when the selected parser rejects input, including unsupported Oracle parse tokens.
 *
 * @param options - Dialect and parser defaults, including `today`, `timeZone` (UTC by default), and `calendar` (iso8601 by default)
 * @throws Errors from evaluating a dialect supplier propagate; Temporal construction failures return undefined.
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
