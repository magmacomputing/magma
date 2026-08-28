import { $ImmutableSkip } from '#library/symbol.library.js';
import { secure } from '#library/proxy.library.js';
import { isReference, isUndefined, isFunction, isString } from '#library/assertion.library.js';
import { registerSerializable } from '#library/serialize.library.js';
import { registerType, getSafeTag } from '#library/type.library.js';
import type { Constructor, Type } from '#library/type.library.js';

/**
 * Some interesting Class Decorators 
 */

/**
 * Safely extracts the class name from Symbol.toStringTag (if present) to prevent 
 * minifiers and compilers from mangling the registered class name.
 */
function getClassName<T extends Constructor>(value: T, contextName: string | symbol | undefined): string | undefined {
	return getSafeTag(value) ?? (isUndefined(contextName) ? (value.name || undefined) : String(contextName));
}

/**
 * Shared helper to create an immutable or secure class wrapper  
 * 
 * @remarks **Workaround:** When TS 7.0 (targeting ES2022) emits its `__esDecorate` IIFE, aggressive 
 * bundlers and minifiers (like `Rollup`, `Terser`, or `esbuild`) frequently compress the variable 
 * declarations into chained assignments (e.g. `var Class = _classThis = class`). This breaks JS 
 * evaluation order and overwrites the decorated wrapper with the original class. 
 * As a permanent defense against these bundler mutations, consuming classes must explicitly return 
 * `Object.freeze(this) as this;` at the end of their own constructors.
 */
function createImmutableWrapper<T extends Constructor>(
	value: T,
	name: string | undefined,
	addInitializer: (fn: () => void) => void,
	immutabilityStrategy: (instance: any) => any							// either Object.freeze or secure (Proxy) strategy
): T {
	const safeName = name || 'Anonymous';
	const wrapper = {
		[safeName]: class extends value {
			constructor(...args: any[]) {
				super(...args);
				return immutabilityStrategy(this);
			}
		}
	}[safeName] as T;

	if (name) {
		registerType(value, `${name}_original` as Type);
		registerType(wrapper, name as Type);
	}

	addInitializer(() => {
		const skip = (value as any)[$ImmutableSkip]
			?? (value as any).$ImmutableSkip
			?? [];

		hardenClassStaticsAndPrototypes(value, wrapper, skip);
	});

	return wrapper;
}

/**
 * Helper to harden static and prototype members of a class
 */
// Hybrid lockdown: lock existing statics for mutation, allow extension
function hardenClassStaticsAndPrototypes(value: any, wrapper: any, skip: any) {
	const lockStatic = (ctor: object) => {
		Reflect.ownKeys(ctor).forEach(name => {
			if (name === 'prototype' || name === 'length' || name === 'name' || name === 'constructor') return;
			if (Array.isArray(skip) && skip.some(s => String(s) === String(name))) return;
			const desc = Object.getOwnPropertyDescriptor(ctor, name);
			if (!desc) return;
			// Only lock if configurable or writable
			const update: PropertyDescriptor = {};
			if (desc.configurable) update.configurable = false;
			if ('writable' in desc && desc.writable) update.writable = false;
			if (Object.keys(update).length)
				Object.defineProperty(ctor, name, { ...desc, ...update });
		});
	}

	// Lock statics for both original and wrapper
	lockStatic(value);
	lockStatic(wrapper);

	// Lock down all existing prototype properties, but do NOT freeze the prototype object
	const lockPrototype = (proto: object) => {
		if (!isReference(proto)) return;
		Reflect.ownKeys(proto).forEach(name => {
			if (name === 'constructor') return;
			if (Array.isArray(skip) && skip.some(s => String(s) === String(name))) return;
			const desc = Object.getOwnPropertyDescriptor(proto, name);
			if (!desc) return;
			const update: PropertyDescriptor = {};
			if (desc.configurable) update.configurable = false;
			if ('writable' in desc && desc.writable) update.writable = false;
			if (Object.keys(update).length)
				Object.defineProperty(proto, name, { ...desc, ...update });
		});
	}

	lockPrototype(value.prototype);
	lockPrototype(wrapper.prototype);
}

/**
 * A class decorator that secures a class instance with a mutation-throwing Proxy.
 * Provides "noisy immutability" by throwing an error if modifications are attempted.
 * 
 * @remarks
 * **Workaround:** To protect against aggressive bundlers (Rollup/Terser) mutating the TS 7.0 
 * ES2022 decorator IIFE structure, users must append `return Object.freeze(this) as this;` 
 * (or the `secure` equivalent) to their constructors to ensure immutability survives production bundling.
 * 
 * @param value - The class constructor to secure
 * @param context - The decorator context
 * @returns The secured class wrapper
 * @example
 * ```ts
 * @Securable
 * class Config { ... }
 * ```
 */
export function Securable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	const finalName = getClassName(value, name);

	switch (kind) {
		case 'class':
			return createImmutableWrapper(value, finalName, addInitializer, secure);
		default:
			throw new Error(`@Securable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** 
 * A class decorator that freezes a class instance to prevent modification.
 * Provides "silent immutability" by silently ignoring modifications in non-strict mode.
 * 
 * @remarks
 * **Workaround:** To protect against aggressive bundlers (Rollup/Terser) mutating the TS 7.0 
 * ES2022 decorator IIFE structure, users must append `return Object.freeze(this) as this;` to their 
 * constructors to ensure immutability survives production bundling.
 * 
 * @param value - The class constructor to freeze
 * @param context - The decorator context
 * @returns The immutable class wrapper
 * @example
 * ```ts
 * @Immutable
 * class Config { ... }
 * ```
 */
export function Immutable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	const finalName = getClassName(value, name);

	switch (kind) {
		case 'class':
			return createImmutableWrapper(value, finalName, addInitializer, (instance) => { Object.freeze(instance); return instance; });

		default:
			throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/**
 * A class decorator that registers a class for serialization with the runtime type system.
 * 
 * @param value - The class constructor to register
 * @param context - The decorator context
 * @returns The original class constructor
 * @example
 * ```ts
 * @Serializable
 * class DataModel { ... }
 * ```
 */
export function Serializable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	const finalName = getClassName(value, name);

	if (finalName)
		registerType(value, finalName as Type);

	switch (kind) {
		case 'class':
			if (finalName)
				addInitializer(() => registerSerializable(finalName, value));// register the class for serialization, via its toString() method

			return value;

		default:
			throw new Error(`@Serializable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/**
 * A class decorator that prevents instantiation of the class.
 * Useful for grouping static methods together without allowing instances to be created.
 * 
 * @param value - The class constructor to make static
 * @param context - The decorator context
 * @returns A wrapper that throws a TypeError when instantiated
 * @example
 * ```ts
 * @Static
 * class MathUtils { ... }
 * ```
 */
export function Static<T extends Constructor>(value: T, { kind, name }: ClassDecoratorContext<T>): T | void {
	const finalName = getClassName(value, name) as Type;

	switch (kind) {
		case 'class': {
			const safeName = finalName || 'Anonymous';
			const wrapper = {
				[safeName]: class extends value {
					constructor(...args: any[]) {
						throw new TypeError(`${safeName} is not a constructor`);
						super(...args);
					}
				}
			}[safeName] as T;

			if (finalName) {
				registerType(value, `${finalName}_original` as Type)// register the original class definition
				registerType(wrapper, finalName);										// register the wrapper as the authoritative definition
			}

			return wrapper;
		}

		default:
			throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
	}
}

/**
 * A class decorator that sets Symbol.toStringTag on the prototype if not already present.
 * Supports both `@StringTag` (without parentheses) and `@StringTag('CustomName')`.
 * 
 * @param tagOrValue - Custom string tag or the class constructor
 * @param context - Optional decorator context when used without parentheses
 * @example
 * ```ts
 *  @ StringTag
 *  class Tapper { ... }
 * 
 *  @ StringTag('CustomTag')
 *  class Special { ... }
 * ```
 */
export function StringTag<T extends Constructor>(tagOrValue?: string | T, context?: ClassDecoratorContext<T>): any {
	const applyTag = (value: T, customTag?: string) => {
		const proto = value.prototype;

		if (proto && !Object.hasOwn(proto, Symbol.toStringTag)) {
			const tagName = customTag ?? value.name;
			Object.defineProperty(proto, Symbol.toStringTag, {
				value: tagName,
				configurable: true,
				writable: false,
				enumerable: false,
			});
		}

		return value;
	}

	if (typeof tagOrValue === 'function' && context?.kind === 'class')
		return applyTag(tagOrValue as T);

	return (value: T, _ctx?: ClassDecoratorContext<T>) => {
		return applyTag(value, isString(tagOrValue) ? tagOrValue : undefined);
	}
}