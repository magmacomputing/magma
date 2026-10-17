import { evaluate, deepFreeze, hasKeys, isDefined } from '@magmacomputing/tempo/library';
import { normalizeDialect } from '../constants.js';
import { explain } from './explain.js';
import { exportDialect } from './export.js';
import type { ConvertOptions, ConvertResult, DialectInput } from '../types.js';

export type { ConvertOptions };

/**
 * Converts a format mask from one dialect directly into another dialect.
 * If fromDialect is omitted, it will be automatically detected.
 *
 * @param mask - Format mask string in the source dialect
 * @param fromOrToOrOptions - Source dialect name/alias, target dialect, or ConvertOptions object
 * @param maybeToDialect - Target dialect name/alias (when fromDialect is explicitly provided)
 */
export function convertDialect(
	mask: string,
	fromOrToOrOptions: DialectInput | ConvertOptions,
	maybeToDialect?: DialectInput
): ConvertResult {
	let fromInput: DialectInput | undefined;
	let toInput: DialectInput;

	if (hasKeys(fromOrToOrOptions, 'to')) {
		fromInput = fromOrToOrOptions.from;
		toInput = fromOrToOrOptions.to;
	} else if (isDefined(maybeToDialect)) {
		fromInput = fromOrToOrOptions;
		toInput = maybeToDialect;
	} else {
		fromInput = undefined;
		toInput = fromOrToOrOptions;
	}

	const to = normalizeDialect(evaluate(toInput));
	const explained = explain(mask, evaluate(fromInput));
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
