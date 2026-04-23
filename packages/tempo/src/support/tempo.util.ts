import { sym, Token } from './tempo.symbol.js';
import { asType } from '#library/type.library.js';
import { isSymbol, isUndefined, isString, isRegExp, isNullish, isObject, isEmpty } from '#library/assertion.library.js';
import { ownEntries, ownKeys } from '#library/primitive.library.js';
import { getRuntime } from './tempo.runtime.js';
import { Match, Snippet, Layout } from './tempo.default.js';
import enums from './tempo.enum.js';
import type * as t from '../tempo.type.js';

/** @internal set a mutable, enumerable property on a target */
export const setProperty = <T>(target: object, key: PropertyKey, value: T) =>
	Object.defineProperty(target, key, { value, writable: true, configurable: true, enumerable: true });

/** @internal return the Prototype parent of an object */
export const proto = (obj: object) => Object.getPrototypeOf(obj);

/** @internal test object has own property with the given key */
export const hasOwn = (obj: object, key: PropertyKey) => Object.hasOwn(obj, key);

/** @internal create an object based on a prototype */
export const create = <T extends object>(obj: object, name: string): T => {
	const entry = proto(obj)[name];
	if (!isObject(entry))
		throw new TypeError(`[Tempo#create] Failed to create shadowed object for '${name}'. The prototype entry from proto(obj) is missing or not an object (received: ${typeof entry}).`);

	return { ...entry } as T;
};

/** @internal resolve a key to a symbol from Token or sym registries */
export function getSymbol(key?: string | symbol): symbol {
	if (isSymbol(key))
		return key as symbol;

	if (isUndefined(key)) {
		const runtime = getRuntime();
		const usr = `usr.${++runtime.usrCount}`;								// allocate a prefixed 'user' key
		return (Token as any)[usr] = Symbol(usr);								// add to Symbol register
	}

	if (isString(key) && (key as string).includes('.')) {
		const description = (key as string).split('.').pop()!;	// use last segment as description
		return (Token as any)[key as string] ??= Symbol(description);
	}

	return (Token as any)[key!] ?? (sym as any)[key!] ?? Symbol.for(`$Tempo.${key as string}`);
}

/** @internal helper to normalize snippet/layout Options into the target Config */
export function collect(target: Record<symbol, any>, value: any, convert: (v: any) => any) {
	const itm = asType(value);

	switch (itm.type) {
		case 'Object':
			ownEntries(itm.value as Record<string, any>)
				.forEach(([k, v]) => target[getSymbol(k)] = convert(v));
			break;
		case 'String':
		case 'RegExp':
			target[getSymbol()] = convert(itm.value);
			break;
		case 'Array':
			(itm.value as any[]).forEach(elm => collect(target, elm, convert));
			break;
	}
}

/** @internal standard date/time component order */
export const SCHEMA = [
	['year', 'yy'], ['month', 'mm'], ['day', 'dd'], ['hour', 'hh'], ['minute', 'mi'], ['second', 'ss'], ['millisecond', 'ms'], ['microsecond', 'us'], ['nanosecond', 'ns']
] as const;

/** @internal get the largest defined unit from a list of ranges */
export function getLargestUnit(list: any[]): string {
	for (const [unit] of SCHEMA) {
		if (list.some(r => r[unit] !== undefined)) return unit;
	}
	return 'nanosecond';
}

/** @internal translates {layout} into an anchored, case-insensitive RegExp. */
export function compileRegExp(layout: string | RegExp, state: t.Internal.State, snippet?: Snippet) {
	// helper function to replace {name} placeholders with their corresponding snippets
	const matcher = (source: string, d = 0): string => {
		if (d > 10) return source;													// prevent infinite recursion

		if (source.startsWith('/') && source.endsWith('/'))
			source = source.substring(1, source.length - 1);			// remove the leading/trailing "/"
		if (source.startsWith('^') && source.endsWith('$'))
			source = source.substring(1, source.length - 1);			// remove the leading/trailing anchors (^ $)

		return source.replace(new RegExp(Match.braces, 'g'), (match, name) => {	// iterate over "{}" pairs in the source string
			const token = getSymbol(name);								// get the symbol for this {name}
			const customs = snippet?.[token as keyof Snippet]?.source ?? snippet?.[name as keyof Snippet]?.source;
			const globals = state.parse.snippet[token as keyof Snippet]?.source ?? state.parse.snippet[name as keyof Snippet]?.source;
			const defaultLayout = Layout[token as keyof typeof Layout];	// get resolution source (layout)

			let res = customs ?? globals ?? defaultLayout;								// get the snippet/layout source

			if (isNullish(res) && name.includes('.')) {						// if no definition found, try fallback
				const prefix = name.split('.')[0];									// get the base token name
				const pToken = getSymbol(prefix);
				res = snippet?.[pToken as keyof Snippet]?.source ?? snippet?.[prefix as keyof Snippet]?.source
					?? state.parse.snippet[pToken as keyof typeof Snippet]?.source ?? state.parse.snippet[prefix as keyof typeof Snippet]?.source
					?? Layout[pToken as keyof typeof Layout];
			}

			if (res && name.includes('.')) {											// wrap dotted extensions for identification
				const safeName = name.replace(/\./g, '_');
				if (!res.startsWith(`(?<${safeName}>`))
					res = `(?<${safeName}>${res})`;
			}

			return (isNullish(res) || res === match)							// if no definition found,
				? match																							// return the original match
				: matcher(res, d + 1);													// else recurse to see if snippet contains embedded "{}" pairs
		});
	};

	try {
		const source = isRegExp(layout) ? layout.source : layout;
		const expanded = matcher(source);
		return new RegExp(`^(${expanded})$`, 'i');
	} catch (e: any) {
		return new RegExp(`^${Match.escape(layout as string)}$`, 'i');
	}
}



/** @internal build RegExp patterns into the state */
export function setPatterns(state: t.Internal.State) {
	// ensure we have our own isolated mutable containers before mutation
	state.parse.snippet = { ...state.parse.snippet };
	state.parse.pattern = new Map(state.parse.pattern);

	const snippet = state.parse.snippet;

	// 1. ensure numeric snippets are current
	if (enums?.NUMBER) {
		const keys = Object.keys(enums.NUMBER).map(w => Match.escape(w));			// escape each key
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
		const compiled = compileRegExp(layout, state, snippet);

		state.parse.pattern.set(symbol, compiled);
	});
}
