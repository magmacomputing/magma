import { isString, isObject, isPlainObject, isUndefined, isSymbol, isEmpty, isFunction, isCallable } from '#library/assertion.library.js';
import { ownKeys, hasAnyOf, hasNoneOf } from '#library/primitive.library.js';
import { cast } from '#library/type.library.js';

import { sym, $IsBase, $Internal, $setConfig, $setDiscovery } from './support.symbol.js';
import { DISCOVERY, Enum } from './support.enum.js';
import { ClassStates } from './support.runtime.js';
import { init } from './support.init.js';
import { setPatterns } from '../engine/engine.pattern.js';

import type * as t from '../tempo.type.js';
import type { Tempo } from '../tempo.class.js';

/**
 * Creates an isolated Tempo subclass sandbox with its own configuration and registries.
 *
 * @param TempoClass - The base Tempo class to inherit from
 * @param arg1 - Configuration options or a scoped execution callback
 * @param arg2 - Scoped execution callback when options are provided in arg1
 * @returns An isolated Tempo subclass or the return value of the execution callback
 * @internal
 */
export function createSandbox<R>(
	TempoClass: typeof Tempo,
	arg1?: t.Options | ((sandbox: typeof Tempo) => R),
	arg2?: (sandbox: typeof Tempo) => R,
): (typeof Tempo) | R {
	let options: t.Options = {};
	let fn: ((sandbox: typeof Tempo) => R) | undefined;

	if (isFunction(arg1)) {
		fn = arg1 as (sandbox: typeof Tempo) => R;
	} else if (isObject(arg1)) {
		options = arg1 as t.Options;
		if (isFunction(arg2))
			fn = arg2;
	}

	const discovery = options.discovery;
	const normalizedDiscovery = (isObject(discovery) && !isSymbol(discovery)) || isUndefined(discovery) || (isSymbol(discovery) && !Symbol.keyFor(discovery))
		? Symbol('TempoSandbox')
		: (isString(discovery) ? Symbol.for(discovery) : discovery) as string | symbol;

	let disposed = false;
	const SandboxTempo = class extends (TempoClass as any) {
		static [Symbol.toStringTag] = 'TempoSandbox';
		static [$IsBase] = false;
		static get isDisposed(): boolean { return disposed; }
		static [Symbol.dispose]() {
			if (disposed) return;
			disposed = true;
			if ((globalThis as any)[normalizedDiscovery as any] === data)
				delete (globalThis as any)[normalizedDiscovery as any];

			ClassStates.delete(SandboxTempo as any);
		}
	};

	let data: any = { options: { ...options, discovery: normalizedDiscovery }, scope: 'sandbox' };

	if (isObject(options.discovery) && !isSymbol(options.discovery))
		data = { ...data, ...options.discovery as any };

	const prevDiscovery = (globalThis as any)[normalizedDiscovery as any];
	(globalThis as any)[normalizedDiscovery as any] = data;

	try {
		const state = init(options, false, (TempoClass as any)[$Internal]());
		state.config.discovery = normalizedDiscovery as any;
		ClassStates.set(SandboxTempo as any, state);
		setPatterns(state); // compile regex patterns for the isolated sandbox state

		// Apply configuration to the sandbox
		(SandboxTempo as any)[$setConfig](state,
			{
				scope: 'sandbox',
				discovery: normalizedDiscovery as any,
				catch: options.catch ?? false
			},
			(SandboxTempo as any)[$setDiscovery](state, data),
			{ ...options, discovery: normalizedDiscovery }
		);

		const pluginsToInstall = options.plugins ?? data?.plugins;
		if (pluginsToInstall && (Array.isArray(pluginsToInstall) || isFunction(pluginsToInstall) || hasAnyOf(pluginsToInstall, 'name', 'key', 'install', sym.$PluginType, 'type'))) {
			let toInstall = pluginsToInstall;
			if (Array.isArray(pluginsToInstall)) {
				const isPlainConfigDict = (item: any) =>
					isPlainObject(item) &&
					!ownKeys(item).some(key => Enum.has(DISCOVERY, key)) &&
					hasNoneOf(item, 'name', 'key', 'install', 'define', sym.$PluginType);

				const remaining: any[] = [];
				for (const item of pluginsToInstall) {
					if (isPlainConfigDict(item)) {
						state.config.plugins = { ...(state.config.plugins ?? {}), ...item };
						state.config.pluginOptions = { ...(state.config.pluginOptions ?? {}), ...item };
					} else {
						remaining.push(item);
					}
				}
				toInstall = remaining;
			}
			if (!isEmpty(toInstall))
				SandboxTempo.use(toInstall);
		}

		Object.freeze(SandboxTempo);
	} catch (err) {
		if (!isUndefined(prevDiscovery)) {
			(globalThis as any)[normalizedDiscovery as any] = prevDiscovery;
		} else {
			delete (globalThis as any)[normalizedDiscovery as any];
		}
		ClassStates.delete(SandboxTempo as any);
		throw err;
	}

	const sb = cast<typeof Tempo>(SandboxTempo);

	if (fn) {
		try {
			const res = fn(sb);
			if (res && isCallable((res as any).then)) {
				return Promise.resolve(res).finally(() => {
					sb[Symbol.dispose]?.();
				}) as R;
			}
			sb[Symbol.dispose]?.();
			return res;
		} catch (err) {
			sb[Symbol.dispose]?.();
			throw err;
		}
	}

	return sb;
}
