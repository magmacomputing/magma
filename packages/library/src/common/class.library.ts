import { $ImmutableSkip } from '#library/symbol.library.js';
import { secure } from '#library/proxy.library.js';
import { registerSerializable } from '#library/serialize.library.js';
import { type Constructor, type Type, registerType } from '#library/type.library.js';

/**
 * Some interesting Class Decorators 
 */

/**
 * Shared helper to create an immutable or secure class wrapper  
 */
function createImmutableWrapper<T extends Constructor>(
	value: T,
	name: string,
	addInitializer: (fn: () => void) => void,
	immutabilityStrategy: (instance: any) => any							// either Object.freeze or secure (Proxy) strategy
): T {
	const wrapper = {
		[name]: class extends value {
			constructor(...args: any[]) {
				super(...args);
				return immutabilityStrategy(this);
			}
		}
	}[name] as T;

	registerType(value, `${name}_original` as Type);
	registerType(wrapper, name as Type);

	addInitializer(() => {
		const skip = (value as any)[$ImmutableSkip]
			?? (value as any).$ImmutableSkip
			?? (value.constructor as any)?.[$ImmutableSkip]
			?? (value.constructor as any)?.$ImmutableSkip
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
		if (!proto || typeof proto !== 'object') return;
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
 * Decorator to secure a class with a mutation-throwing Proxy (noisy immutability)
 */
export function Securable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			return createImmutableWrapper(value, name, addInitializer, secure);
		default:
			throw new Error(`@Securable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** decorator to freeze a Class to prevent modification (silent immutability) */
export function Immutable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			return createImmutableWrapper(value, name, addInitializer, (instance) => { Object.freeze(instance); return instance; });

		default:
			throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** register a Class for serialization */
export function Serializable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);																			// cast as String
	registerType(value, name as Type);

	switch (kind) {
		case 'class':
			addInitializer(() => registerSerializable(name, value));// register the class for serialization, via its toString() method

			return value;

		default:
			throw new Error(`@Serializable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** make a Class not instantiable */
export function Static<T extends Constructor>(value: T, { kind, name }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			const wrapper = {
				[name]: class extends value {
					constructor(...args: any[]) {
						super(...args);
						throw new TypeError(`${name} is not a constructor`);
					}
				}
			}[name] as T;

			registerType(value, `${name}_original` as Type);			// register the original class definition
			registerType(wrapper, name as Type);									// register the wrapper as the authoritative definition

			return wrapper;

		default:
			throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
	}
}