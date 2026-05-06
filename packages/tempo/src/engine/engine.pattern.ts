// engine.pattern.ts
// Pattern Compiler and Cache Engine for Tempo
// Responsible for snippet/layout expansion, regex compilation, and pattern caching

import { isRegExp, isNullish, isEmpty, isString } from '#library/assertion.library.js';
import { ownEntries, ownKeys } from '#library/primitive.library.js';
import { Match, Snippet, Layout } from '../support/tempo.default.js';
import { getSymbol, logError } from '../support/tempo.util.js';
import { Token } from '../support/tempo.symbol.js';
import enums from '../support/tempo.enum.js';
import type * as t from '../tempo.type.js';

export interface PatternCompilerOptions {
	state: t.Internal.State;
}

export class PatternCompiler {
	#state: t.Internal.State;
	#cache: Map<string, RegExp> = new Map();

	constructor(options: PatternCompilerOptions) {
		this.#state = options.state;
	}

	/**
	 * Translates {layout} into an anchored, case-insensitive RegExp.
	 * Includes recursive expansion of placeholders using snippet registries.
	 */
	compileRegExp(layout: string | RegExp, snippet?: Snippet): RegExp {
		const source = isRegExp(layout) ? layout.source : layout;
		
		// Simple cache check for the raw source
		const cacheKey = `${source}:${snippet ? 'custom' : 'global'}`;
		if (this.#cache.has(cacheKey)) {
			return this.#cache.get(cacheKey)!;
		}

		const matcher = (src: string, d = 0): string => {
			if (d > 10) return src; // prevent infinite recursion

			if (src.startsWith('/') && src.endsWith('/'))
				src = src.substring(1, src.length - 1);
			if (src.startsWith('^') && src.endsWith('$'))
				src = src.substring(1, src.length - 1);

			return src.replace(new RegExp(Match.braces, 'g'), (match, name) => {
				const token = getSymbol(name);
				const customs = snippet?.[token as keyof Snippet]?.source ?? snippet?.[name as keyof Snippet]?.source;
				const globals = this.#state.parse.snippet[token as keyof Snippet]?.source ?? this.#state.parse.snippet[name as keyof Snippet]?.source;
				const stateLayout = this.#state.parse.layout[token as keyof Layout] ?? this.#state.parse.layout[name as keyof Layout];
				const defaultLayout = Layout[token as keyof Layout];

				let res = customs ?? globals ?? stateLayout ?? defaultLayout;

				if (isNullish(res) && name.includes('.')) {
					const prefix = name.split('.')[0];
					const pToken = getSymbol(prefix);
					res = snippet?.[pToken as keyof Snippet]?.source ?? snippet?.[prefix as keyof Snippet]?.source
						?? this.#state.parse.snippet[pToken as keyof Snippet]?.source ?? this.#state.parse.snippet[prefix as keyof Snippet]?.source
						?? this.#state.parse.layout[pToken as keyof Layout] ?? this.#state.parse.layout[prefix as keyof Layout]
						?? Layout[pToken as keyof Layout];
				}

				if (res && name.includes('.')) {
					const safeName = name.replace(/\./g, '_');
					if (!res.startsWith(`(?<${safeName}>`))
						res = `(?<${safeName}>${res})`;
				}

				return (isNullish(res) || res === match)
					? match
					: matcher(res, d + 1);
			});
		};

		try {
			const expanded = matcher(source);
			const compiled = new RegExp(`^(${expanded})$`, 'i');
			this.#cache.set(cacheKey, compiled);
			return compiled;
		} catch (e: any) {
			const fallback = new RegExp(`^${Match.escape(layout as string)}$`, 'i');
			this.#cache.set(cacheKey, fallback);
			return fallback;
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
			snippet[Token.afx] = new RegExp(`((s)? (?<afx>${Match.affix.source}))?${snippet[Token.sep].source}?`);
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
		ownEntries(state.parse.layout).forEach(([key, layout]) => {
			const symbol = getSymbol(key);
			const compiled = this.compileRegExp(layout, snippet);

			state.parse.pattern.set(symbol, compiled);
		});
	}

	/**
	 * Clear the pattern cache.
	 */
	clearCache() {
		this.#cache.clear();
	}
}

/**
 * Functional wrapper for the PatternCompiler.
 * Handles engine instantiation and pattern building for a given state.
 */
export function setPatterns(state: t.Internal.State) {
	if (!state.patternCompiler) {
		state.patternCompiler = new PatternCompiler({ state });
	}
	state.patternCompiler.setPatterns();
}
