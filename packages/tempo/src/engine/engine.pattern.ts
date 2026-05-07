// engine.pattern.ts
// Pattern Compiler and Cache Engine for Tempo
// Responsible for snippet/layout expansion, regex compilation, and pattern caching

import { isRegExp, isNullish, isEmpty, isString } from '#library/assertion.library.js';
import { ownEntries, ownKeys } from '#library/primitive.library.js';
import { Match, Snippet, Layout } from '../support/support.default.js';
import { getSymbol, hasOwn, logWarn, logError } from '../support/support.util.js';
import { Token } from '../support/support.symbol.js';
import enums from '../support/support.enum.js';
import type * as t from '../tempo.type.js';

const BRACES_REGEX = new RegExp(Match.braces, 'g');

export interface PatternCompilerOptions {
	state: t.Internal.State;
}

export class PatternCompiler {
	#state: t.Internal.State;
	#globalCache: Map<string, RegExp> = new Map();
	#snippetCache: WeakMap<Snippet, Map<string, RegExp>> = new WeakMap();

	constructor(options: PatternCompilerOptions) {
		this.#state = options.state;
	}

	get state() { return this.#state; }

	/**
	 * Translates {layout} into an anchored, case-insensitive RegExp.
	 * Includes recursive expansion of placeholders using snippet registries.
	 */
	compileRegExp(layout: string | RegExp, snippet?: Snippet): RegExp {
		const state = this.#state;
		const source = isRegExp(layout) ? layout.source : layout;
		let cache: Map<string, RegExp>;
		if (snippet) {
			if (!this.#snippetCache.has(snippet)) {
				this.#snippetCache.set(snippet, new Map());
			}
			cache = this.#snippetCache.get(snippet)!;
		} else {
			cache = this.#globalCache;
		}
		if (cache.has(source)) {
			return cache.get(source)!;
		}

		const matcher = (source: string, d = 0): string => {
			if (d > 10) {																					// Emit a diagnostic if recursion limit is hit (likely circular placeholder)
				logWarn(this.#state.config, `[PatternCompiler] Recursion limit exceeded in matcher (d > 10) for src:`, source, `depth:`, d);
				return source;
			}

			if (source.startsWith('/') && source.endsWith('/'))
				source = source.substring(1, source.length - 1);		// remove the leading/trailing "/"
			if (source.startsWith('^') && source.endsWith('$'))
				source = source.substring(1, source.length - 1);		// remove the leading/trailing anchors (^ $)

			return source.replace(BRACES_REGEX, (match, name) => {// iterate over "{}" pairs in the source string
				const token = getSymbol(name);											// get the symbol for this {name}
				const customs = snippet?.[token as keyof Snippet]?.source ?? snippet?.[name as keyof Snippet]?.source;
				const globals = state.parse.snippet[token as keyof Snippet]?.source ?? state.parse.snippet[name as keyof Snippet]?.source;
				const stateLayout = state.parse.layout[token as keyof Layout] ?? state.parse.layout[name as keyof Layout];
				const defaultLayout = Layout[token as keyof Layout];// get resolution source (layout)

				let res = customs ?? globals ?? stateLayout ?? defaultLayout;						// get the snippet/layout source

				if (isNullish(res) && name.includes('.')) {					// if no definition found, try fallback
					const prefix = name.split('.')[0];								// get the base token name
					const pToken = getSymbol(prefix);
					res = snippet?.[pToken as keyof Snippet]?.source ?? snippet?.[prefix as keyof Snippet]?.source
						?? state.parse.snippet[pToken as keyof Snippet]?.source ?? state.parse.snippet[prefix as keyof Snippet]?.source
						?? state.parse.layout[pToken as keyof Layout] ?? state.parse.layout[prefix as keyof Layout]
						?? Layout[pToken as keyof Layout];
				}

				if (res && name.includes('.')) {										// wrap dotted extensions for identification
					let safeName = name.trim().replace(/[^A-Za-z0-9_$]/g, '_');
					if (!/^[A-Za-z_$]/.test(safeName)) safeName = `_${safeName}`;
					if (!res.startsWith(`(?<${safeName}>`))
						res = `(?<${safeName}>${res})`;
				}

				return (isNullish(res) || res === match)						// if no definition found,
					? match																						// return the original match
					: matcher(res, d + 1);														// else recurse to see if snippet contains embedded "{}" pairs
			});
		};

		try {
			const expanded = matcher(source);
			const compiled = new RegExp(`^(${expanded})$`, 'i');
			cache.set(source, compiled);
			return compiled;
		} catch (e: any) {
			// Use the computed source for fallback, do not cache fallback, and log error
			logError(this.#state.config, { context: 'pattern compile failed', pattern: source }, e);
			return new RegExp(`^${Match.escape(source)}$`, 'i');
		}
	}

	/**
	 * Build RegExp patterns into the state.
	 * Re-evaluates all snippets and layouts.
	 */
	setPatterns() {
		this.clearCache();
		const state = this.#state;
		// ensure we have our own isolated mutable containers before mutation
		state.parse.snippet = { ...state.parse.snippet };
		state.parse.pattern = new Map();

		const snippet = state.parse.snippet;

		// 1. ensure numeric snippets are current
		if (enums?.NUMBER) {
			const keys = Object.keys(enums.NUMBER).map(w => Match.escape(w));
			const nbr = new RegExp(`(?<nbr>[0-9]+|${keys.sort((a, b) => b.length - a.length).join('|')})`);

			snippet[Token.nbr] = nbr;
			snippet[Token.mod] = new RegExp(`((?<mod>${Match.modifier.source})?${nbr.source}? *)`);
			snippet[Token.afx] = new RegExp(`((s)? (?<afx>${Match.affix.source}))?${snippet[Token.sep]?.source || ''}?`);
		}

		// 2. build ignore pattern
		const ignores = ownKeys(state.parse.ignore, true);

		if (!isEmpty(ignores)) {
			const words = ignores
				.filter(isString)
				.map(w => Match.escape(w.toLowerCase()))
				.join('|');

			state.parse.ignorePattern = new RegExp(`\\b(${words})\\b`, 'gi');
		} else {
			delete state.parse.ignorePattern;
		}

		// 3. build the patterns
		ownEntries(state.parse.layout, true).forEach(([key, layout]) => {
			const symbol = getSymbol(key);
			const compiled = this.compileRegExp(layout, snippet);

			state.parse.pattern.set(symbol, compiled);
		});
	}

	/**
	 * Clear the pattern cache.
	 */
	clearCache() {
		this.#globalCache.clear();
		// WeakMap has no clear(), so re-instantiate to drop all snippet-specific caches
		this.#snippetCache = new WeakMap();
	}
}

/**
 * Functional wrapper for the PatternCompiler.
 * Handles engine instantiation and pattern building for a given state.
 */
export function setPatterns(state: t.Internal.State) {
	// 🛡️ Critical fix: ensure we use an OWN PatternCompiler for each state to avoid cross-pollution
	if (!hasOwn(state, 'patternCompiler') || !state.patternCompiler)
		state.patternCompiler = new PatternCompiler({ state });

	state.patternCompiler.setPatterns();
}
