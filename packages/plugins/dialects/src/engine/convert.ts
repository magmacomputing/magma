import { evaluate, deepFreeze } from '@magmacomputing/tempo/library';
import { normalizeDialect, type Dialect } from '../constants.js';
import { explain } from './explain.js';
import { exportDialect } from './export.js';
import type { ConvertResult, DialectInput } from '../types.js';

/**
 * Converts a format mask from one dialect directly into another dialect.
 * If fromDialect is omitted, it will be automatically detected.
 *
 * @param mask - Format mask string in the source dialect
 * @param fromOrToDialect - Source dialect name/alias, or target dialect if from is auto-detected
 * @param maybeToDialect - Target dialect name/alias (when fromDialect is explicitly provided)
 */
export function convertDialect(
	mask: string,
	fromOrToDialect: DialectInput,
	maybeToDialect?: DialectInput
): ConvertResult {
	let fromInput: DialectInput | undefined;
	let toInput: DialectInput;

	if (maybeToDialect !== undefined) {
		fromInput = fromOrToDialect;
		toInput = maybeToDialect;
	} else {
		fromInput = undefined;
		toInput = fromOrToDialect;
	}

	const to = normalizeDialect(evaluate(toInput));
	const explained = explain(mask, fromInput ? evaluate(fromInput) : undefined);
	const exported = exportDialect(explained.pattern, to);

	const unsupportedSet = new Set<string>();
	for (const token of explained.tokens) {
		const upper = token.source.toUpperCase();
		if (!token.tempo && upper !== 'FM' && upper !== 'FX')
			unsupportedSet.add(token.source);
	}
	for (const token of exported.unsupported)
		unsupportedSet.add(token);

	const result: ConvertResult = {
		from: explained.dialect,
		to,
		source: mask,
		pattern: exported.pattern,
		unsupported: Array.from(unsupportedSet),
		toString() {
			return exported.pattern;
		},
	};

	return deepFreeze(result);
}
