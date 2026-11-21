import { Tempo } from '@magmacomputing/tempo';
import { $Internal, watchIntl, type IntlWatcher } from '@magmacomputing/tempo/plugin/sdk';
import type { WatchSystemConfigOptions } from '../types/index.js';

const LOCALIZED_SNIPPET_KEYS = new Set(['mon', 'mmm', 'wkd', 'www', 'mm']);

function preserveMonthDay(monthDay: any): any {
	if (!monthDay || monthDay.isExplicit)
		return monthDay;
	const { active: _active, isExplicit: _isExplicit, ...rest } = monthDay;
	return rest;
}

function extractParseEntries(
	source: Record<string | symbol, any> | undefined,
	excludeStrings?: Set<string>,
): Record<string, any> | undefined {
	if (!source)
		return undefined;
	const result: Record<string, any> = {};
	let hasEntries = false;
	for (const [k, v] of Object.entries(source)) {
		if (excludeStrings?.has(k))
			continue;
		result[k] = v;
		hasEntries = true;
	}
	for (const sym of Object.getOwnPropertySymbols(source)) {
		const keyFor = Symbol.keyFor(sym);
		const key = keyFor?.startsWith('$Tempo.') ? keyFor.slice(7) : sym.description;
		if (!key || excludeStrings?.has(key))
			continue;
		result[key] = source[sym];
		hasEntries = true;
	}
	return hasEntries ? result : undefined;
}

function preserveParseRegistry(
	configRegistry: Record<string, any> | undefined,
	parseState: Record<string, any> | undefined,
	internalState: Record<string, any> | undefined,
): Record<string, any> | undefined {
	if (!parseState)
		return configRegistry;
	const userProvidedKeys: Set<string> | undefined = internalState?.userProvidedKeys;
	const optionRegistry = internalState?.options?.registry;
	const localizedEvents = new Set<string>(parseState.localizedEvents ?? []);
	const events = extractParseEntries(parseState.event, localizedEvents);
	const snippets = userProvidedKeys?.has('snippet')
		? optionRegistry?.snippets
		: undefined;
	const layouts = userProvidedKeys?.has('layout')
		? (optionRegistry?.layouts ?? extractParseEntries(parseState.layout))
		: undefined;

	return {
		...(configRegistry ?? {}),
		...(events ? { events } : {}),
		...(snippets ? { snippets } : {}),
		...(layouts ? { layouts } : {}),
		...(parseState.period ? { periods: parseState.period } : {}),
		...(parseState.ignore ? { ignores: parseState.ignore } : {}),
	};
}

/**
 * Watches the host runtime's resolved `Intl` locale and IANA time zone and
 * synchronizes changes into `Tempo.init()` (or a target sandbox) without polling.
 */
export function watchSystemConfig(options: WatchSystemConfigOptions = {}): IntlWatcher {
	const target = options.target ?? Tempo;
	const syncLocale = options.locale !== false;
	const syncTimeZone = options.timeZone !== false;

	return watchIntl(({ locale, timeZone }) => {
		if (!syncLocale && !syncTimeZone)
			return;
		const internalState = (target as any)[$Internal]?.();
		const userProvidedKeys: Set<string> | undefined = internalState?.userProvidedKeys;
		const parseState = (target as any).parse;
		const configPatch: Record<string, any> = { ...(target.config ?? {}) };
		if (!userProvidedKeys?.has('sphere'))
			delete configPatch.sphere;

		const pluginsDb = internalState?.pluginsDb;
		const registeredPlugins = [
			...(Array.isArray(configPatch.plugins) ? configPatch.plugins : []),
			...(Array.isArray(pluginsDb?.plugins) ? pluginsDb.plugins : []),
			...(Array.isArray(pluginsDb?.terms) ? pluginsDb.terms : []),
		];

		const registry = preserveParseRegistry(configPatch.registry, parseState, internalState);
		const patch: Record<string, any> = {
			...configPatch,
			...(registeredPlugins.length > 0 ? { plugins: [...new Set(registeredPlugins)] } : {}),
			...(registry ? { registry } : {}),
			...(parseState ? {
				pivot: parseState.pivot,
				mode: parseState.mode,
				monthDay: preserveMonthDay(parseState.monthDay),
				planner: parseState.planner,
			} : {}),
		};
		if (syncLocale)
			patch.locale = locale;
		if (syncTimeZone)
			patch.timeZone = timeZone;
		target.init(patch);
	}, options);
}
