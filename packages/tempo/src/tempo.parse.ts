import { markConfig } from '#library/symbol.library.js';
import { getRuntime } from './support/tempo.runtime.js';
import { init, extendState } from './support/tempo.init.js';
import { ParseEngine } from './plugin/module/module.parse.js';
import { setPatterns } from './support/tempo.util.js';
import type { DateTime, Options, Internal } from './tempo.type.js';

export * from './plugin/module/module.parse.js';

/**
 * Standalone Smart Parser
 * Returns a native Temporal.ZonedDateTime without requiring the full Tempo class.
 *
 * @example
 * import { parse } from '@magmacomputing/tempo/parse';
 * const zdt = parse('tomorrow', { timeZone: 'Europe/Paris' });
 */
export function parse(value: DateTime, options: Options = {}): Temporal.ZonedDateTime {
	const runtime = getRuntime();
	const globalState = runtime.state ?? init();

	// Create a local state shadowed from the global state
	const state: Internal.State = {
		config: markConfig(Object.create(globalState.config)),
		parse: markConfig(Object.create(globalState.parse))
	} as Internal.State;

	// Standalone parsing defaults to 'strict' mode
	const localOptions = { ...options };
	localOptions.mode ??= 'strict';

	// Apply options
	extendState(state, localOptions);

	// Compile RegEx patterns
	setPatterns(state);

	// Execute the parse
	return ParseEngine.parse(state, value);
}
