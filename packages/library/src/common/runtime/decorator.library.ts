import { $Mutable, $Unwrapped } from '#library/symbol.library.js';
import { secure } from '#library/proxy.library.js';
import { isReference, isUndefined, isString, isSymbol } from '#library/assertion.library.js';
import { registerSerializable } from '#library/serialize.library.js';
import { registerType, getSafeTag } from '#library/type.library.js';
import type { Constructor, Type } from '#library/type.library.js';

/**
 * Some interesting Class Decorators 
 */

/**
 * Determines a class name from its string tag, decorator context name, or constructor name.
 *
 * @param value - The class whose name should be determined
 * @param contextName - An optional name from the decorator context
 * @returns The resolved class name, or `undefined` when no name is available
 * @internal
 */
function getClassName<T extends Constructor>(value: T, contextName: string | symbol | undefined): string | undefined {
	return getSafeTag(value) ?? (isUndefined(contextName) ? (value.name || undefined) : String(contextName));
}

/**
 * Creates a class wrapper that applies an immutability strategy to each instance and hardens its static and prototype members.
 *
 * @param value - The class to wrap
 * @param name - The wrapper's class name, when available
 * @param immutabilityStrategy - The strategy applied to each created instance
 * @returns A wrapped class that applies the immutability strategy to instances
 * @internal
 */
function createImmutableWrapper<T extends Constructor>(
	value: T,
	name: string | undefined,
	addInitializer: (initializer: () => void) => void,
	immutabilityStrategy: (instance: any) => any,
	metadata?: any
): T {
	const safeName = name || 'Anonymous';

	addInitializer(() => {
		const metaSymbol = (Symbol as any).metadata;
		const meta = metadata ?? (metaSymbol ? (value as any)[metaSymbol] : undefined);

		const skip = [
			...((value as any)[$Mutable] ?? (value as any).$Mutable ?? []),
			...((value?.prototype as any)?.[$Mutable] ?? (value?.prototype as any)?.$Mutable ?? []),
			...(meta?.[$Mutable] ?? meta?.$Mutable ?? []),
		];

		hardenClassStaticsAndPrototypes(value, value, skip);
	});

	// Classes with private static state (#field or transpiled WeakMap private fields) cannot be subclass-wrapped
	// without breaking ECMAScript private field brand checks. Return original constructor directly.
	const codeStr = typeof value === 'function' ? Function.prototype.toString.call(value) : '';
	const hasPrivateState = codeStr.includes('#') || codeStr.includes('WeakMap') || codeStr.includes('__private') || codeStr.includes('privateMap');
	const isRawConstructor = (value as any)[$Unwrapped] === true || (value as any).raw === true || (value as any)[$Mutable] === 'unwrapped' || hasPrivateState;

	if (isRawConstructor) {
		if (name) registerType(value, name as Type);
		return value;
	}

	const wrapper = {
		[safeName]: class extends value {
			constructor(...args: any[]) {
				super(...args);
				return immutabilityStrategy(this);
			}
		}
	}[safeName] as T;

	if (name)
		registerType(wrapper, name as Type);

	return wrapper;
}

/**
 * Determines if a member should be skipped during hardening based on the skip list.
 * Supports both simple string/symbol entries and conditional skip entries.
 *
 * @param name - The member name to check
 * @param skipList - Array of skip entries (strings, symbols, or conditional objects)
 * @returns True if the member should be skipped, false otherwise
 * @internal
 */
function shouldSkipMember(name: string | symbol, skipList: any): boolean {
	if (!Array.isArray(skipList)) return false;
	return skipList.some(entry => {
		if (isString(entry) || isSymbol(entry)) {
			return entry === name;
		}
		if (entry && typeof entry === 'object' && 'name' in entry) {
			if (entry.name !== name) return false;
			return typeof entry.condition === 'function' ? Boolean(entry.condition()) : Boolean(entry.condition ?? true);
		}
		return false;
	});
}

/**
 * Locks existing static and prototype members while allowing new members to be added.
 *
 * @internal
 */
function hardenClassStaticsAndPrototypes(value: any, wrapper: any, skip: any) {
	const lockStatic = (ctor: object) => {
		Reflect.ownKeys(ctor).forEach(name => {
			if (name === 'prototype' || name === 'length' || name === 'name' || name === 'constructor') return;
			if (shouldSkipMember(name, skip)) return;
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
			if (shouldSkipMember(name, skip)) return;
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
export function Securable<T extends Constructor>(value: T, { kind, name, addInitializer, metadata }: ClassDecoratorContext<T>): T | void {
	const finalName = getClassName(value, name);

	switch (kind) {
		case 'class':
			return createImmutableWrapper(value, finalName, addInitializer, secure, metadata);
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
export function Immutable<T extends Constructor>(value: T, { kind, name, addInitializer, metadata }: ClassDecoratorContext<T>): T | void {
	const finalName = getClassName(value, name);

	switch (kind) {
		case 'class':
			return createImmutableWrapper(value, finalName, addInitializer, (instance) => { Object.freeze(instance); return instance; }, metadata);

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
	const applyTag = (value: T, customTag?: string, contextName?: string | symbol) => {
		const proto = value.prototype;
		const tagName = customTag ?? getClassName(value, contextName);

		if (tagName) {
			if (proto && !Object.hasOwn(proto, Symbol.toStringTag)) {
				Object.defineProperty(proto, Symbol.toStringTag, {
					value: tagName,
					configurable: true,
					writable: false,
					enumerable: false,
				});
			}

			if (!value.name || value.name !== tagName) {
				try {
					Object.defineProperty(value, 'name', {
						value: tagName,
						configurable: true,
						writable: false,
						enumerable: false,
					});
				} catch { }
			}
		}

		return value;
	}

	if (typeof tagOrValue === 'function' && context?.kind === 'class')
		return applyTag(tagOrValue as T, undefined, context.name);

	return (value: T, ctx?: ClassDecoratorContext<T>) => {
		return applyTag(value, isString(tagOrValue) ? tagOrValue : undefined, ctx?.name);
	}
}

export interface SingletonOptions {
	/** If true, prevents throwing when subsequent instantiations pass different arguments */
	allowArgMismatch?: boolean;
}

/**
 * A class decorator that transforms a class into a Singleton pattern.
 * Intercepts constructor calls to return a cached instance upon subsequent instantiations.
 * Also attaches a static `.instance` property to the decorated constructor.
 * 
 * @param targetOrOptions - Class constructor or Singleton options
 * @param context - Optional decorator context (when used without parentheses)
 * @example
 * ```ts
 *  @ Singleton
 *  class ConfigStore {
 *    public apiKey = 'secret_123';
 *  }
 * 
 *  const a = new ConfigStore();
 *  const b = new ConfigStore();
 *  console.log(a === b); // true
 *  console.log((ConfigStore as any).instance === a); // true
 * ```
 */
export function Singleton<T extends Constructor>(
	targetOrOptions?: T | SingletonOptions,
	context?: ClassDecoratorContext<T>
): any {
	const decorate = (value: T, options?: SingletonOptions) => {
		let instance: InstanceType<T> | undefined;
		let initialArgs: any[] | undefined;
		const safeName = value.name || 'Singleton';

		const wrapper = {
			[safeName]: class extends value {
				constructor(...args: any[]) {
					if (instance) {
						if (options?.allowArgMismatch !== true && initialArgs) {
							const prev = initialArgs;
							const isMismatch = args.length !== prev.length || args.some((arg, i) => arg !== prev[i]);
							if (isMismatch)
								throw new Error(`[Singleton] Argument mismatch on subsequent instantiation of '${safeName}'`);
						}
						return instance as any;
					}
					super(...args);
					initialArgs = args;
					instance = this as InstanceType<T>;
					return this;
				}
			}
		}[safeName] as T;

		Object.defineProperty(wrapper, 'instance', {
			get: () => instance,
			configurable: true,
			enumerable: false,
		});

		return wrapper;
	};

	if (typeof targetOrOptions === 'function' && context?.kind === 'class') {
		return decorate(targetOrOptions as T);
	}

	return (value: T, _ctx?: ClassDecoratorContext<T>) => {
		return decorate(value, targetOrOptions as SingletonOptions);
	};
}

export type MutableCondition = boolean | (() => boolean);

/**
 * A method, property, or getter decorator that marks a class member to remain mutable
 * when the class is decorated with `@Immutable` or `@Securable`.
 *
 * @param condition - Optional boolean or predicate function. If provided, the member remains mutable ONLY when condition evaluates to true.
 * @example
 * ```ts
 *  @ Mutable()
 *  static cache;
 *
 *  @ Mutable(() => isTestEnvironment())
 *  static init() { ... }
 * ```
 */
export function Mutable(targetOrCondition?: MutableCondition | any, context?: any): any {
	const applyMutable = (ctx: any, condition?: MutableCondition) => {
		const entry = {
			name: ctx.name,
			condition: typeof condition === 'function' ? condition : () => (condition ?? true),
		};

		if (ctx.metadata) {
			let list = ctx.metadata[$Mutable];
			if (!Array.isArray(list)) {
				list = [];
				Object.defineProperty(ctx.metadata, $Mutable, { value: list, writable: true, configurable: true });
			}
			list.push(entry);
		}

		ctx.addInitializer(function (this: any) {
			const targets = [this];
			if (this && typeof this.constructor === 'function' && this.constructor !== this) {
				targets.push(this.constructor);
			}
			for (const target of targets) {
				let list = (target as any)[$Mutable];
				if (!Array.isArray(list)) {
					list = [];
					Object.defineProperty(target, $Mutable, { value: list, writable: true, configurable: true });
				}
				list.push(entry);
			}
		});
	};

	if (context && typeof context === 'object' && 'kind' in context)
		return applyMutable(context, true);

	return (_value: any, ctx: any) => {
		applyMutable(ctx, targetOrCondition as MutableCondition);
	};
}