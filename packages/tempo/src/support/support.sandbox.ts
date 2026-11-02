import { isString, isObject, isPlainObject, isUndefined, isSymbol, isEmpty, isFunction, isCallable, isReference } from '#library/assertion.library.js';
import { ownKeys, hasOwn, hasAnyOf, hasNoneOf } from '#library/primitive.library.js';
import { cast } from '#library/type.library.js';
import { Branded } from '#library/decorator.library.js';

import { sym, $IsBase, $Internal, $guard, $setConfig, $setDiscovery, $Sandbox, isSandbox } from './support.symbol.js';
import { DISCOVERY, Enum } from './support.enum.js';
import { ClassStates, getRuntime } from './support.runtime.js';
import { init } from './support.init.js';
import { setPatterns } from '../engine/engine.pattern.js';

import type * as t from '../tempo.type.js';
import type { Tempo } from '../tempo.class.js';

const sandboxPredecessors = new WeakMap<object, any>();

const findLivePredecessor = (prev: any): any => {
	let live = prev;
	while (live?.sandbox?.isDisposed) live = sandboxPredecessors.get(live);
	return live;
};

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

	let data: any = { options: { ...options, discovery: normalizedDiscovery }, scope: 'sandbox' };

	if (isObject(options.discovery) && !isSymbol(options.discovery))
		data = { ...data, ...options.discovery as any };

	const prevDiscovery = (globalThis as any)[normalizedDiscovery as any];
	(globalThis as any)[normalizedDiscovery as any] = data;
	sandboxPredecessors.set(data, prevDiscovery);

	let disposed = false;
	let state: any;

	const getOwnerState = (owner: any): any => {
		if (!owner) return undefined;
		if (hasOwn(owner, 'writtenVersions')) return owner;
		const s = ClassStates.get(owner);
		if (s) return s;
		return owner;
	};

	const isOwnerDisposed = (owner: any): boolean => {
		if (!owner) return false;
		if (owner === TempoClass) return false;
		if (owner.disposed === true || owner.isDisposed === true) return true;
		const s = getOwnerState(owner);
		if (s?.disposed === true || s?.isDisposed === true) return true;
		return false;
	};

	const cleanupSandbox = () => {
		if (disposed) return;
		disposed = true;
		if (state) state.disposed = true;

		if ((globalThis as any)[normalizedDiscovery as any] === data) {
			const live = findLivePredecessor(prevDiscovery);
			if (live) {
				(globalThis as any)[normalizedDiscovery as any] = live;
			} else {
				delete (globalThis as any)[normalizedDiscovery as any];
			}
		}

		if (state && hasOwn(state, 'writtenVersions') && state.writtenVersions) {
			const rt = getRuntime();
			const myOwner = state;
			const myClass = SandboxTempo;

			for (const [vKey, vInfo] of state.writtenVersions.entries()) {
				const currentOwner = rt.versionOwners?.get(vKey);
				const isCurrentOwner = currentOwner === myOwner || currentOwner === myClass;

				if (isCurrentOwner) {
					if (vInfo.hadVersion && vInfo.prevVersion !== undefined) {
						rt.versions[vKey] = vInfo.prevVersion;
					} else {
						delete rt.versions[vKey];
					}

					let pred = vInfo.prevOwner;
					while (pred && isOwnerDisposed(pred)) {
						const predState = getOwnerState(pred);
						pred = predState?.writtenVersions?.get(vKey)?.prevOwner;
					}

					if (pred) {
						rt.versionOwners?.set(vKey, pred);
					} else {
						rt.versionOwners?.delete(vKey);
					}
				} else {
					let curr = currentOwner;
					const chain: Array<{ owner: any; state: any; info: any }> = [];
					while (curr) {
						const s = getOwnerState(curr);
						const info = s?.writtenVersions?.get(vKey);
						chain.push({ owner: curr, state: s, info });
						curr = info?.prevOwner;
					}

					const myIdx = chain.findIndex(node => node.owner === myOwner || node.owner === myClass || node.state === state);
					if (myIdx > 0) {
						let successorNode: { owner: any; state: any; info: any } | undefined;
						for (let i = myIdx - 1; i >= 0; i--) {
							if (!isOwnerDisposed(chain[i].owner)) {
								successorNode = chain[i];
								break;
							}
						}
						if (successorNode?.info) {
							successorNode.info.prevVersion = vInfo.prevVersion;
							successorNode.info.hadVersion = vInfo.hadVersion;
							successorNode.info.prevOwner = vInfo.prevOwner;
						}
					}
				}
			}
		}

		ClassStates.delete(SandboxTempo as any);
	};

	const SandboxTempo = @Branded($Sandbox, 'SandboxTempo') class extends (TempoClass as any) {
		static [Symbol.toStringTag] = 'TempoSandbox';
		static [$IsBase] = false;
		static [$Sandbox] = true;
		static isSandbox = isSandbox;
		static [Symbol.hasInstance](val: unknown): boolean {
			return isReference(val) && isReference(this?.prototype) && Object.prototype.isPrototypeOf.call(this.prototype, val);
		}
		static get isDisposed(): boolean { return disposed; }
		static [Symbol.dispose]() {
			cleanupSandbox();
		}
		static async [Symbol.asyncDispose]() {
			cleanupSandbox();
		}
		static hasModule(name: string): boolean {
			if (disposed) return false;
			return (TempoClass as any).hasModule.call(this, name);
		}
		static get [$guard]() {
			if (disposed) return { test: () => false };
			const s = ClassStates.get(SandboxTempo as any);
			return (s as any)?.[$guard] ?? { test: () => false };
		}
		get isSandbox(): boolean {
			return isSandbox(this);
		}
		get isDisposed(): boolean {
			return disposed;
		}
		hasModule(name: string): boolean {
			if (disposed) return false;
			return (this.constructor as any).hasModule(name);
		}
		get [$guard]() {
			if (disposed) return { test: () => false };
			return (this.constructor as any)[$guard];
		}
	};

	data.sandbox = SandboxTempo;

	Object.defineProperty(SandboxTempo.prototype, Symbol.toStringTag, {
		value: 'TempoSandbox',
		configurable: true,
		writable: false,
		enumerable: false,
	});

	try {
		state = init(options, false, (TempoClass as any)[$Internal]());
		state.config.discovery = normalizedDiscovery as any;
		ClassStates.set(SandboxTempo as any, state);
		setPatterns(state); // compile regex patterns for the isolated sandbox state

		// Apply configuration to the sandbox
		(SandboxTempo as any)[$setConfig](state,
			{
				scope: 'sandbox',
				discovery: normalizedDiscovery as any,
				catch: options.catch ?? (state.config as any).catch ?? false,
			},
			(SandboxTempo as any)[$setDiscovery](state, data),
			{ ...options, discovery: normalizedDiscovery },
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
		cleanupSandbox();
		throw err;
	}

	const sb = cast<typeof Tempo>(SandboxTempo);

	if (fn) {
		let isAsync = false;
		try {
			const res = fn(sb);
			if (res && isCallable((res as any).then)) {
				isAsync = true;
				return Promise.resolve(res).finally(() => {
					sb[Symbol.dispose]?.();
				}) as R;
			}
			return res;
		} finally {
			if (!isAsync) sb[Symbol.dispose]?.();
		}
	}

	return sb;
}
