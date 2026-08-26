import { isFunction, isString, isUndefined, isClass, isObject, isDefined, isSymbol } from '#library/assertion.library.js';
import { secureRef, delegate } from '#library/proxy.library.js';

import { sym, isTempo } from '../support/support.symbol.js';
import { TempoError } from '../support/support.error.js';
import { getRuntime } from '../support/support.runtime.js';
import { hasOwn, logError } from '#tempo/support/support.util.js';
import type { Tempo } from '../tempo.class.js';
import type { Plugin, Module } from './plugin.type.js';
import { TEMPO_VERSION } from '../tempo.version.js';

export type TempoType = typeof Tempo;
export type TempoPlugin = Plugin<TempoType>;
export type TempoModule = Module<TempoType>;

/**
 * Resolves the host Tempo class constructor for a given instance, value, or runtime environment.
 */
export function getHost(t: any): any {
	const TempoClass = getRuntime().modules['Tempo'];
	if (isFunction(t) || isClass(t)) return t;
	if (isTempo(t)) return (t as any).constructor ?? TempoClass;
	return TempoClass ?? (t as any)?.constructor;
}

/**
 * ## ensureModule
 * Ensure a specific module is loaded, throwing a friendly error if not.
 */
export function ensureModule(t: any, module: string, silent: boolean = false): boolean {
	const host = getHost(t);
	const rt = getRuntime();
	const mod = module === 'term' ? 'TermsModule' : module;
	const hostLogic = (rt.modules as any)[mod];
	const state = host[sym.$Internal]?.() || rt.state;

	// terms fallback only applies when the canonical module entry actually exists in the discovery database
	const isTermsLoaded = (mod === 'TermsModule') && state &&
		(isDefined(hostLogic) || rt.installed.has('TermsModule') || state.pluginsDb.plugins.some((p: any) => p.name === 'TermsModule')) &&
		state.pluginsDb.terms.length > 0;

	if (!isDefined(hostLogic) && !isTermsLoaded) {
		const baseName = mod.endsWith('Module') ? mod.slice(0, -6) : mod;
		const importPath = baseName === 'Terms' ? 'term' : baseName.toLowerCase();
		const msg = `${mod} not loaded. (Did you forget to Tempo.extend(${mod}) or import '#tempo/${importPath}' / '@magmacomputing/tempo/${importPath}'?)`;
		if (!silent) logError(msg, t?.config);

		if (silent) return false;
		if (t?.config?.catch === true) return false;
		throw new TempoError(msg);
	}
	return true;
}
/**
 * ## interpret
 * Utility to safely delegate calls to the Tempo Interpreter with catch-support.
 */
export function interpret(t: any, module: string, methodOrFallback?: any, silent: boolean = false, ...args: any[]) {
	const host = getHost(t);

	// 1. Module Validation
	if (!ensureModule(t, module, silent)) {
		if (isFunction(methodOrFallback)) return methodOrFallback.apply(t, args);
		if ((isString(methodOrFallback) || isUndefined(methodOrFallback)) && (t?.config?.catch === true || silent)) return t;
		return undefined;
	}

	const rt = getRuntime();
	const hostLogic = (rt.modules as any)[module];

	// 2. Resolve the specific logic (either the module itself or a sub-method)
	const logic = isString(methodOrFallback) ? hostLogic[methodOrFallback] : hostLogic;

	// 3. Logic Not Found or Not a Function
	if (!isFunction(logic)) {
		// Fallback to calling the function if provided
		if (isFunction(methodOrFallback)) return methodOrFallback.apply(t, args);

		// Special case: if hostLogic is an object and the first arg is a valid method name
		if (isObject(hostLogic) && isString(args[0]) && isFunction((hostLogic as any)[args[0]])) {
			const method = args.shift();
			return (hostLogic as any)[method].apply(t, args);
		}

		const msg = `${module} method '${String(methodOrFallback)}' not found`;
		logError(msg, t?.config);
		throw new TempoError(msg);
	}

	// 4. Execute the logic
	return logic.apply(t, args);
}

/**
 * ## defineModule
 * Used to register an internal modularization component.
 */
export function defineModule<T extends Plugin<TempoType>>(module: T): T {
	const result = { ...module, [sym.$PluginType]: 'module' };
	registerPlugin(result);
	return result as unknown as T;
}

/**
 * ## attachStatics
 * Safely attach static properties to a class, ensuring they are non-enumerable
 * to prevent @Immutable from freezing them.
 */
export function attachStatics(TempoClass: any, props: Record<string, any>) {
	for (const [key, val] of Object.entries(props)) {
		if (hasOwn(TempoClass, key)) {
			const existing = (TempoClass as any)[key];
			if (existing === val || (isObject(val) && 'value' in val && val.value === existing))
				continue;
			const msg = `Static name collision on "${key}". Property is already defined on the host class.`;
			logError(msg, { ...TempoClass?.config, catch: true });
			continue;
		}

		const isDescriptor = isObject(val) && (
			(val as any)[sym.$Descriptor] === true ||
			(
				(isDefined(val.get) || isDefined(val.set) || isDefined(val.value) || isDefined(val.writable) || isDefined(val.configurable) || isDefined(val.enumerable)) &&
				(!isDefined(val.get) || isFunction(val.get)) &&
				(!isDefined(val.set) || isFunction(val.set))
			)
		);

		// attachStatics: Intentional ordering in Object.defineProperty overrides any caller-provided flags in isDescriptor to force non-enumerable behavior (avoiding @Immutable exposure).
		Object.defineProperty(TempoClass, key, {
			...(isDescriptor ? val : { value: val, writable: true }),
			enumerable: false,
			configurable: true
		});
	}
}

/**
 * ## defineInterpreterModule
 * Used to register a module that attaches methods to the Tempo sym.$Interpreter registry.
 */
export function defineInterpreterModule(name: string, logic: any, statics?: Record<string, any>) {
	return defineModule({
		name,
		version: TEMPO_VERSION,
		install(this: TempoType, TempoClass: TempoType) {
			const rt = getRuntime();
			const modules = rt.modules;

			// 1. Secure the Global Registry
			if (isUndefined(modules[name])) {
				modules[name] = logic;
			} else if (modules[name] !== logic) {
				throw new TempoError(`Tempo Security: Core Module clash for '${name}'. Logic is already defined.`);
			}

			// 2. Fallback for legacy class-local access
			if (isUndefined((TempoClass as any)[sym.$Interpreter])) {
				Object.defineProperty(TempoClass, sym.$Interpreter, {
					value: secureRef({}),
					enumerable: false,
					configurable: true,
					writable: true
				});
			}

			if (isDefined((TempoClass as any)[sym.$Interpreter][name])) {
				if ((TempoClass as any)[sym.$Interpreter][name] !== logic) throw new TempoError(`Tempo Interpreter Module clash: '${name}' logic is already defined.`);
			} else {
				(TempoClass as any)[sym.$Interpreter][name] = logic;
			}

			// 3. Attach static methods if provided
			if (isDefined(statics)) attachStatics(TempoClass, statics);
		},
	});
}

/**
 * ## definePlugin
 * Used to register a plugin.
 */
export function definePlugin<T extends Plugin<TempoType>>(plugin: T): T {
	const result = { ...plugin, [sym.$PluginType]: 'plugin' };
	registerPlugin(result);
	return result as unknown as T;
}

/**
 * ## registerPlugin
 * Registration hook for general plugins.
 */
export function registerPlugin(plugin: any, state?: any) {
	const rt = getRuntime();

	// Validate and persist in the state's discovery database.
	if (state) rt.addPlugin(state, plugin);
	else if (rt.state) rt.addPlugin(rt.state, plugin);

	// Only persist to the global extension list for global-state registrations.
	// Sandbox registrations (state !== rt.state) are tracked in the sandbox's
	// ScopedSet and must not bleed into the global rt.extensions array.
	const targetState = state ?? rt.state;
	if (!targetState || targetState === rt.state) {
		rt.addExtension(plugin);
	}
	rt.emit(sym.$Register, plugin);

	return plugin;
}

export type NamespaceConfig = {
	name: string | symbol;
	version?: string;
	resolvers: Record<string | symbol, (tempo: Tempo) => any>;
};

/**
 * ## defineNamespace
 * Creates a lazy-loaded property namespace on the Tempo instance.
 */
export function defineNamespace(config: NamespaceConfig): Plugin<TempoType> {
	if (isSymbol(config.name) && !config.name.description)
		throw new TempoError('Tempo Security: Symbol namespaces must have a description.');

	const namespaceStr = isSymbol(config.name)
		? (Symbol.keyFor(config.name) ? `@@${Symbol.keyFor(config.name)}` : `@${config.name.description}`)
		: config.name;

	const pluginName = `${namespaceStr}Namespace`;
	const weakCache = new WeakMap<object, any>();

	const plugin = {
		name: pluginName,
		version: config.version ?? TEMPO_VERSION,
		[sym.$PluginType]: 'namespace',
		install(this: TempoType, TempoClass: TempoType, options?: any) {
			Object.defineProperty(TempoClass.prototype, config.name, {
				get() {
					const cacheKey = isSymbol(config.name) ? namespaceStr : `_${namespaceStr}`;
					const isExtensible = Reflect.isExtensible(this);

					if (!isExtensible && weakCache.has(this)) return weakCache.get(this);
					if (isExtensible && this[cacheKey]) return this[cacheKey];

					const target = Object.create(null);
					const proxy = delegate(target, (key) => {
						const resolver = config.resolvers[key as keyof typeof config.resolvers];
						if (resolver) return resolver(this);
						return undefined;
					}, true);

					if (isExtensible) {
						Object.defineProperty(this, cacheKey, {
							value: proxy,
							writable: true,
							configurable: true,
							enumerable: false
						});
					} else {
						weakCache.set(this, proxy);
					}
					
					return proxy;
				},
				configurable: true,
				enumerable: false
			});
		}
	} as unknown as Plugin<TempoType>;

	registerPlugin(plugin);
	return plugin;
}
