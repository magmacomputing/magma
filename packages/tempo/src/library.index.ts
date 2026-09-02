/**
 * # Magma Library
 * This is a secondary entry point for the "Magma Utility Stack".
 * It provides curated access to the specific utilities Magma uses under the hood.
 */

export { Pledge } from '#library/pledge.class.js';
export * as cipher from '#library/cipher.library.js';
export * as webToken from '#library/webtoken.library.js';

export { enumify, type Enum } from '#library/enumerate.library.js';
export { fetchRequest, fetchHead, HttpError } from '#library/request.library.js';
export { stringify, objectify, cloneify } from '#library/serialize.library.js';
export { parseJSONC, stripJSONC, cleanify, isJSON, rawJSON, isRawJSON } from '#library/json.library.js';
export { geoLookup } from '#library/mapper.library.js';
export { getContext, CONTEXT } from '#library/utility.library.js';
export { Interval } from '#library/scheduling/interval.class.js';

export * from '#library/proxy.library.js';
export * from '#library/coercion.library.js';
export * from '#library/assertion.library.js';
export * from '#library/evaluation.library.js';
export * from '#library/function.library.js';
export * from '#library/object.library.js';
export * from '#library/array.library.js';
export * from '#library/string.library.js';
export * from '#library/number.library.js';
export * from '#library/temporal.library.js';
export * from '#library/calendar.library.js';
export * from '#library/rrule.library.js';
export * from '#library/cron.library.js';
export * from '#library/decorator.library.js';

export type {
	OwnOf,
	KeyOf,
	ValueOf,
	EntryOf,
	Evaluable,
	AsyncEvaluable,
	EvaluableRecord,
	AsyncEvaluableRecord,
	Resolved,
} from '#library/type.library.js';
