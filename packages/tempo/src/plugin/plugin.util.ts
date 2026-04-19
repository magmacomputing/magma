import { isFunction, isString, isUndefined, isClass, isObject, isDefined } from '#library/type.library.js';
import { secureRef } from '#library/proxy.library.js';

import sym from '../support/tempo.symbol.js';
import { getRuntime } from '../support/tempo.runtime.js';
import type { Tempo } from '../tempo.class.js';
import type { Plugin } from './plugin.type.js';

export function getHost(t: any): any {
	return isFunction(t) || isClass(t) ? t : (t as any).constructor;
}

/**
 * ## ensureModule
 * Ensure a specific module is loaded, throwing a friendly error if not.
 */
export function ensureModule(t: any, module: string, silent: boolean = false): boolean {
	const host = getHost(t);
	const rt = getRuntime();
	const hostLogic = (rt.modules as any)[module];
	const isTermsLoaded = (module === 'term' || module === 'TermsModule') && rt.terms.length > 0;

	if (!isDefined(hostLogic) && !isTermsLoaded) {
		const baseName = module.endsWith('Module') ? module.slice(0, -6) : module;
		const msg = `Tempo: ${module} not loaded. (Did you forget to Tempo.extend(${module}) or import '#tempo/${baseName.toLowerCase()}'?)`;
		if (!silent && isFunction(host?.[sym.$logError])) host[sym.$logError](t?.config, msg);

		if (silent) return false;
		if (t?.config?.catch === true) return false;
		throw new Error(msg);
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

		const msg = `Tempo: ${module} method '${String(methodOrFallback)}' not found`;
		if (isFunction(host?.[sym.$logError])) host[sym.$logError](t?.config, msg);
		throw new Error(msg);
	}

	// 4. Execute the logic
	return logic.apply(t, args);
}

/**
 * ## defineModule
 * Used to register an internal modularization component.
 */
export const defineModule = <T extends Plugin>(module: T): T => {
	registerPlugin(module);
	return module;
}

/**
 * ## attachStatics
 * Safely attach static properties to a class, ensuring they are non-enumerable
 * to prevent @Immutable from freezing them.
 */
export function attachStatics(TempoClass: any, props: Record<string, any>) {
	for (const [key, val] of Object.entries(props)) {
		if (Object.hasOwn(TempoClass, key)) continue;

		const isDescriptor = isObject(val) && (isFunction((val as any).get) || isFunction((val as any).set));

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
export const defineInterpreterModule = (name: string, logic: any, statics?: Record<string, any>) =>
	defineModule({
		name,
		install(this: Tempo, TempoClass: typeof Tempo) {
			const rt = getRuntime();
			const modules = rt.modules;

			// 1. Secure the Global Registry
			if (isUndefined(modules[name])) {
				modules[name] = logic;
			} else if (modules[name] !== logic) {
				throw new Error(`Tempo Security: Core Module clash for '${name}'. Logic is already defined.`);
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
				if ((TempoClass as any)[sym.$Interpreter][name] !== logic) throw new Error(`Tempo Interpreter Module clash: '${name}' logic is already defined.`);
			} else {
				(TempoClass as any)[sym.$Interpreter][name] = logic;
			}

			// 3. Attach static methods if provided
			if (isDefined(statics)) attachStatics(TempoClass, statics);
		},
	});

/**
 * ## defineExtension
 * Used to register a class-augmenting extension.
 */
export const defineExtension = <T extends Plugin>(extension: T): T => {
	registerPlugin(extension);
	return extension;
}

/**
 * ## registerPlugin
 * Registration hook for general plugins.
 */
export function registerPlugin(plugin: any) {
	const rt = getRuntime();

	// Validate and persist in the runtime's discovery database.
	rt.addPlugin(plugin);

	if (!rt.extensions.includes(plugin)) {
		rt.extensions.push(plugin);
	}

	rt.emit(sym.$Register, plugin);

	return plugin;
}
