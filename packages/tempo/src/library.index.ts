/**
 * # Magma Library
 * This is a secondary entry point for the "Magma Utility Stack".
 * It provides curated access to the specific utilities Magma uses under the hood.
 */

export { Pledge } from '#library/pledge.class.js';
export * as cipher from '#library/cipher.library.js';
export * as webToken from '#library/webtoken.library.js';
export { enumify, type Enum } from '#library/enumerate.library.js';
export { proxify } from '#library/proxy.library.js';
export { stringify, objectify, cloneify } from '#library/serialize.library.js';
export { isObject, isFunction, isDefined, isUndefined, isEmpty, isNumeric, isFiniteNumber } from '#library/assertion.library.js';
export { asArray } from '#library/coercion.library.js';
export { instant, normaliseFractionalDurations } from '#library/temporal.library.js';

export type { OwnOf, KeyOf, ValueOf, EntryOf } from '#library/type.library.js';
