import { isString, isObject, isPlainObject, isUndefined, isDefined, isSymbol, isEmpty, isFunction, isText, isClass } from '#library/assertion.library.js';
import { ownKeys, hasKey, hasAnyOf, hasNoneOf } from '#library/primitive.library.js';
import { asArray } from '#library/coercion.library.js';
import { Enum } from '#library/enumerate.library.js';
import { pad } from '#library/string.library.js';

import { sym, $Internal, $setConfig, $setDiscovery, $setEvents, $setPeriods, $buildGuard } from './support.symbol.js';
import { DISCOVERY, enums } from './support.enum.js';
import { getRuntime, _lifecycle } from './support.runtime.js';
import { setPatterns } from '../engine/engine.pattern.js';
import { logWarn, logDebug, logError } from './support.util.js';

import { registerPlugin } from '../plugin/plugin.util.js';
import { registerTerm } from '../plugin/term/term.util.js';
import type { TermPlugin } from '../plugin/term/term.type.js';
import type { Tempo } from '../tempo.class.js';

/**
 * Applies plugins, terms, modules, and discovery configurations to a Tempo class or sandbox subclass.
 *
 * @param TempoClass - The Tempo class or sandbox subclass to extend
 * @param args - Plugin entries, terms, tuples, or options
 * @returns The extended Tempo class for chaining
 * @internal
 */
export function usePlugin(TempoClass: typeof Tempo, args: any[]): typeof Tempo {
	const isPluginLike = (arg: any): boolean =>
		Array.isArray(arg) ||
		isFunction(arg) ||
		hasAnyOf(arg, 'install', 'define', sym.$PluginType);

	const isPlainConfigDict = (arg: any) =>
		isPlainObject(arg) &&
		!ownKeys(arg).some(key => Enum.has(DISCOVERY, key)) &&
		hasNoneOf(arg, 'name', 'key', 'install', 'define', sym.$PluginType) &&
		ownKeys(arg).length > 0 &&
		ownKeys(arg).every(k => isObject(arg[k]));

	const isPluginTuple = (entry: any): entry is [any, any] =>
		Array.isArray(entry) &&
		entry.length === 2 &&
		!Array.isArray(entry[0]) &&
		isPluginLike(entry[0]) &&
		isObject(entry[1]) &&
		!isPlainConfigDict(entry[1]) &&
		!isPluginLike(entry[1]);

	const isOptionsArg = (arg: any) =>
		isObject(arg) &&
		!isPluginLike(arg) &&
		!isPlainConfigDict(arg);

	const lastArg = args.at(-1);
	let options = (args.length > 1 && (isOptionsArg(lastArg) || isSymbol(lastArg)))
		? args.pop()
		: undefined;

	const flattenPlugins = (arr: any[]): any[] => {
		const result: any[] = [];
		for (const item of arr) {
			if (isPluginTuple(item)) {
				result.push(item);
			} else if (Array.isArray(item)) {
				result.push(...flattenPlugins(item));
			} else if (item != null) {
				result.push(item);
			}
		}
		return result;
	};

	const items = flattenPlugins(args);
	if (isEmpty(items)) return TempoClass;

	const rt = getRuntime();
	_lifecycle.extendDepth++; // increment the re-entrant nesting counter
	try {
		items.forEach(item => {
			let plugin = item;
			let callSiteOptions: any = undefined;

			// 1. Unpack tuple syntax: [Plugin, Options]
			if (isPluginTuple(item)) {
				plugin = item[0];
				callSiteOptions = item[1];
			}

			// 2. Resolve Factory Closures or Callable Plugins
			if (isFunction(plugin)) {
				if (plugin[sym.$PluginType] || isFunction(plugin.install) || isFunction(plugin.define)) {
					callSiteOptions = { ...((plugin as any).options ?? {}), ...(callSiteOptions ?? {}) };
				} else if (plugin.length === 0 && !isUndefined(callSiteOptions)) {
					// Potential factory function passed in tuple: [factoryFn, opts]
					const res = (plugin as any)(callSiteOptions);
					if (hasAnyOf(res, 'install', 'define', sym.$PluginType)) {
						plugin = res;
						callSiteOptions = { ...((res as any).options ?? {}), ...(callSiteOptions ?? {}) };
					}
				}
			} else if (hasKey(plugin, 'options') && plugin.options) {
				callSiteOptions = { ...((plugin as any).options ?? {}), ...(callSiteOptions ?? {}) };
			}

			let pluginType = (plugin as any)?.[sym.$PluginType] || (plugin as any)?.type;
			if (!pluginType && hasKey(plugin, 'define', isFunction) && hasKey(plugin, 'key')) pluginType = 'term';
			if (!pluginType && hasKey(plugin, 'install', isFunction)) pluginType = 'plugin';

			if (!pluginType && isFunction(plugin)) {
				// Legacy Standard Plugin registration callback: (Tempo, options, rehydrator)
				const state = (TempoClass as any)[$Internal]();
				const installed = state.installed ?? rt.installed; // ScopedSet for sandboxes, global Set for Tempo
				if (installed.has(plugin)) return;
				installed.add(plugin); // mark as installed (BEFORE side-effects)

				registerPlugin(plugin, state);
				const pluginName = (plugin as any).name;
				const existingConfigOpts = isText(pluginName)
					? (state.config.pluginOptions?.[pluginName] ?? state.config.plugins?.[pluginName])
					: undefined;
				const resolvedOptions = {
					...(isObject(existingConfigOpts) ? existingConfigOpts : {}),
					...(isObject(options) ? options : {}),
					...(isObject(callSiteOptions) ? callSiteOptions : {})
				};

				if (isText(pluginName) && pluginName !== 'anonymous' && !isEmpty(resolvedOptions)) {
					state.config.pluginOptions = {
						...(state.config.pluginOptions ?? {}),
						[pluginName]: resolvedOptions
					};
				}

				try {
					(plugin as any)(TempoClass, !isEmpty(resolvedOptions) ? resolvedOptions : options, (val: any) => new TempoClass(val));
				} catch (e: any) {
					const msg = (e?.message ?? '').toLowerCase();
					if (msg.includes('constructor') || msg.includes('class') || msg.includes('extensible') || msg.includes('read only') || isClass(plugin)) {
						logWarn(`Misidentified class or frozen sandbox in plugin registration: ${(plugin as any).name}`, state.config, e.stack ?? e);
					} else {
						throw e;
					}
				}
				return;
			}

			if (isObject(plugin) || isFunction(plugin)) {
				const assertContract = (isValid: boolean, msg: string) => {
					if (!isValid) {
						const config = (TempoClass as any)[$Internal]().config;
						if (config.catch) {
							logError(msg, config);
							return false;
						}
						throw new TypeError(msg);
					}
					return true;
				};

				switch (pluginType) {
					case 'plugin':
					case 'namespace':
					case 'properties':
					case 'module': {
						if (!assertContract(isFunction(plugin.install), `[Tempo] Invalid ${pluginType} object: missing 'install()' method.`)) return;

						const name = (plugin as any).name;
						const state = (TempoClass as any)[$Internal]();
						const installed = state.installed ?? rt.installed; // ScopedSet for sandboxes, global Set for Tempo

						// Resolve options precedence: existingConfigOpts < options < callSiteOptions
						const existingConfigOpts = name
							? (state.config.pluginOptions?.[name] ?? state.config.plugins?.[name])
							: undefined;
						const resolvedOptions = {
							...(isObject(existingConfigOpts) ? existingConfigOpts : {}),
							...(isObject(options) ? options : {}),
							...(isObject(callSiteOptions) ? callSiteOptions : {})
						};

						// Automatically synchronize resolved options to state.config.pluginOptions
						if (name && !isEmpty(resolvedOptions)) {
							state.config.pluginOptions = {
								...(state.config.pluginOptions ?? {}),
								[name]: resolvedOptions
							};
						}

						const hasExplicitOptions = (isObject(callSiteOptions) && !isEmpty(callSiteOptions)) ||
							(isObject(options) && !isEmpty(options));

						if (name && installed.has(name)) {
							if (pluginType === 'properties') {
								logDebug(`Properties plugin already installed by name: ${name}`, state.config);
								return;
							}
							if (hasExplicitOptions) {
								registerPlugin(plugin, state);
								const installOpts = resolvedOptions;
								(plugin as any).install.call(TempoClass, TempoClass, installOpts);
							} else {
								logDebug(`Plugin already installed by name: ${name}`, state.config);
							}
							return;
						}
						if (!name && installed.has(plugin)) return; // identity-based dedup for unnamed plugins
						if (name) installed.add(name); else installed.add(plugin);

						registerPlugin(plugin, state);
						if (plugin.version && isString(name)) {
							let suffix = '';
							if (pluginType === 'plugin') suffix = 'Plugin';
							else if (pluginType === 'namespace') suffix = 'Namespace';
							else if (pluginType === 'module') suffix = 'Module';
							else suffix = 'Plugin';

							rt.versions[`${name}${name.endsWith(suffix) ? '' : suffix}`] = plugin.version;
						}
						const installOpts = !isEmpty(resolvedOptions) ? resolvedOptions : options;
						(plugin as any).install.call(TempoClass, TempoClass, installOpts);
						break;
					}
					case 'term': {
						if (!assertContract(isFunction(plugin.define), `[Tempo] Invalid term object: missing 'define()' method.`)) return;

						const config = plugin as TermPlugin;
						const state = (TempoClass as any)[$Internal]();
						const termName = config.scope || config.key;

						// Resolve options precedence: existingConfigOpts < options < callSiteOptions
						const existingConfigOpts = termName
							? (state.config.pluginOptions?.[termName] ?? state.config.plugins?.[termName])
							: undefined;
						const resolvedOptions = {
							...(isObject(existingConfigOpts) ? existingConfigOpts : {}),
							...(isObject(options) ? options : {}),
							...(isObject(callSiteOptions) ? callSiteOptions : {})
						};

						// Automatically synchronize resolved options to state.config.pluginOptions
						if (termName && !isEmpty(resolvedOptions)) {
							state.config.pluginOptions = {
								...(state.config.pluginOptions ?? {}),
								[termName]: resolvedOptions
							};
						}

						const termConfig: TermPlugin = !isEmpty(resolvedOptions)
							? { ...config, options: resolvedOptions }
							: config;

						if (rt.termMap.get(config.key) === config) {
							if (!isEmpty(resolvedOptions)) {
								rt.termMap.set(config.key, termConfig);
								if (config.scope) rt.termMap.set(config.scope, termConfig);
								registerTerm(termConfig, (TempoClass as any)[$Internal]());
							}
							return;
						}
						if (rt.termMap.has(config.key)) {
							const existing = rt.termMap.get(config.key);
							const rangesMatch = JSON.stringify(existing?.ranges) === JSON.stringify(config.ranges);
							if (existing?.scope === config.scope && existing?.description === config.description && rangesMatch) {
								logDebug(`[Tempo#extend] Duplicate term registration ignored for key: "${config.key}"`, state.config);
								if (!isEmpty(resolvedOptions)) {
									rt.termMap.set(config.key, termConfig);
									if (config.scope) rt.termMap.set(config.scope, termConfig);
									registerTerm(termConfig, (TempoClass as any)[$Internal]());
								}
								return;
							}
							logError(`[Tempo#extend] Term collision on key: "${config.key}". Registration aborted.`, state.config);
							return;
						}
						if (config.scope && rt.termMap.get(config.scope) === config) { /* continue */ }
						else if (config.scope && rt.termMap.has(config.scope)) {
							const existingScope = rt.termMap.get(config.scope);
							const rangesMatch = JSON.stringify(existingScope?.ranges) === JSON.stringify(config.ranges);
							if (existingScope?.key === config.key && existingScope?.description === config.description && rangesMatch) {
								/* continue */
							} else {
								logError(`[Tempo#extend] Term collision on scope: "${config.scope}". Registration aborted.`, state.config);
								return;
							}
						}

						rt.termMap.set(config.key, termConfig);
						if (config.scope) rt.termMap.set(config.scope, termConfig);
						for (const alias of asArray(config.aliases))
							if (!rt.termMap.has(alias)) rt.termMap.set(alias, termConfig);

						if (config.version) {
							const name = config.scope || config.key;
							rt.versions[`${name}Term`] = config.version;
						}

						registerTerm(termConfig, (TempoClass as any)[$Internal]());

						// 1a. sync with alias engine
						if (config.scope && config.ranges) {
							const type = config.scope === 'period' ? 'per' : (config.scope === 'event' ? 'evt' : undefined);
							if (type) {
								const aliases: [string, any][] = [];
								const monthKeys = Enum.keys(enums.MONTH);
								config.ranges.forEach(r => {
									if (r.key) {
										let val: string | undefined;
										if (isDefined(r.hour)) {
											if (Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23)
												val = `${r.hour}:${pad(r.minute ?? 0)}`;
										} else if (r.month) {
											if (Number.isInteger(r.month) && r.month >= 1 && r.month <= 12)
												val = `${pad(r.day ?? 1)} ${monthKeys[r.month - 1]}`;
										}

										if (val) aliases.push([r.key, val]);
									}
								});

								if (aliases.length > 0) {
									const state = (TempoClass as any)[$Internal]();
									if (type === 'per') (TempoClass as any)[$setPeriods](state, aliases);
									else if (type === 'evt') (TempoClass as any)[$setEvents](state, aliases);
								}
							}
						}
						break;
					}
					default: {
						// Safe fallback to Discovery Object parsing
						const discovery = item as any;
						const opts = (TempoClass as any)[$setDiscovery]((TempoClass as any)[$Internal](), discovery);
						if (!isEmpty(opts)) (TempoClass as any)[$setConfig]((TempoClass as any)[$Internal](), opts);

						// If a plain configuration dictionary was supplied directly in the plugins array (e.g. { ai: { timeout: 1000 } })
						const isPlainConfigDict = isPlainObject(discovery) &&
							!ownKeys(discovery).some(key => Enum.has(DISCOVERY, key)) &&
							hasNoneOf(discovery, 'name', 'key', 'install');
						if (isPlainConfigDict) {
							const state = (TempoClass as any)[$Internal]();
							/** @deprecated Supplying plain configuration dictionaries in the plugins array is deprecated. Use 'pluginOptions' instead. */
							state.config.plugins = { ...(state.config.plugins ?? {}), ...discovery };
							state.config.pluginOptions = { ...(state.config.pluginOptions ?? {}), ...discovery };
						}

						if (discovery.plugins && (Array.isArray(discovery.plugins) || isFunction(discovery.plugins) || hasAnyOf(discovery.plugins, 'name', 'key', 'install')))
							TempoClass.use(discovery.plugins);

						// only trigger init if we're assigning a new discovery object to a symbol
						if (ownKeys(item).some(key => Enum.has(DISCOVERY, key))) {
							const discoveryArg = (isSymbol(options) ? options : (options as any)?.discovery) ?? sym.$Tempo;
							const discoverySymbol = isString(discoveryArg) ? Symbol.for(discoveryArg) : discoveryArg;

							if ((globalThis as Record<symbol, any>)[discoverySymbol as symbol] !== item)
								(globalThis as Record<symbol, any>)[discoverySymbol as symbol] = item;

							(TempoClass as any)[$setConfig]((TempoClass as any)[$Internal](), { discovery: discoverySymbol });
						}
						break;
					}
				}
			}
		});
	} finally {
		_lifecycle.extendDepth--; // decrement the re-entrant nesting counter
	}

	if (_lifecycle.extendDepth === 0) {
		(TempoClass as any)[$buildGuard]();
		setPatterns((TempoClass as any)[$Internal]()); // rebuild the global patterns
	}

	return TempoClass;
}
