import '#library/temporal.polyfill.js';
import { enumify } from '#library/enumerate.library.js';
import { asArray } from '#library/coercion.library.js';
import { getDateTimeFormat, getHemisphere } from '#library/international.library.js';
import { markConfig } from '#library/symbol.library.js';
import { ownEntries } from '#library/primitive.library.js';

import { getRuntime } from './tempo.runtime.js';
import { setProperty, hasOwn, create, collect } from './tempo.util.js';
import { sym } from './tempo.symbol.js';
import { Match, Snippet, Layout, Event, Period, Ignore, Guard, Default } from './tempo.default.js';
import enums, { STATE } from './tempo.enum.js';
import * as t from '../tempo.type.js';

/** @internal Initialise the global Tempo state */
export function init(options: t.Options = {}) {
	const runtime = getRuntime();
	if (runtime.state) return runtime.state;

	const { timeZone, calendar } = getDateTimeFormat();

	const state: any = {
		config: {},
		parse: {}
	};

	// 1. Establish the base parsing state
	state.parse = markConfig({
		snippet: Object.assign({}, Snippet),
		layout: Object.assign({}, Layout),
		event: Object.assign({}, Event),
		period: Object.assign({}, Period),
		ignore: Object.fromEntries(asArray(Ignore).map(w => [w, w])),
		mdyLocales: asArray(Default.mdyLocales as any),
		mdyLayouts: asArray(Default.mdyLayouts as any) as t.Pair[],
		pivot: Default.pivot,
		mode: Default.mode as any,
		lazy: false,
		pattern: new Map<symbol, RegExp>(),
	});

	// 2. Establish the base configuration options
	state.config = markConfig(Object.create(Default));
	Object.defineProperties(state.config, {
		calendar: { value: calendar, enumerable: true, writable: true, configurable: true },
		timeZone: { value: timeZone, enumerable: true, writable: true, configurable: true },
		locale: { value: (getDateTimeFormat() as any).locale ?? 'en-US', enumerable: true, writable: true, configurable: true },
		discovery: { value: Symbol.keyFor(sym.$Tempo) as string, enumerable: true, writable: true, configurable: true },
		formats: { value: enumify(STATE.FORMAT, false), enumerable: true, writable: true, configurable: true },
		sphere: { value: getHemisphere(timeZone), enumerable: true, writable: true, configurable: true },
		get: { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true },
		scope: { value: 'global', enumerable: true, writable: true, configurable: true },
		catch: { value: options.catch ?? false, enumerable: true, writable: true, configurable: true }
	});

	// 3. Initialize registries that need objects
	state.OPTION = new Set(Object.keys(Default));
	state.ZONED_DATE_TIME = new Set(['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone', 'calendar']);

	runtime.state = state;
	return state;
}

/** @internal Extend a Tempo state with new options (Shadowing) */
export function extendState(state: any, options: t.Options) {
	const { isString, isObject, isUndefined, isRegExp, asType } = getRuntime().modules['Library'] ?? {
		isString: (v: any) => typeof v === 'string',
		isObject: (v: any) => typeof v === 'object' && v !== null,
		isUndefined: (v: any) => v === undefined,
		isRegExp: (v: any) => v instanceof RegExp,
		asType: (v: any) => ({ type: typeof v, value: v }) // basic fallback
	};

	ownEntries(options).forEach(([optKey, optVal]) => {
		if (isUndefined(optVal)) return;
		const arg = asType(optVal);

		switch (optKey) {
			case 'snippet':
			case 'layout':
			case 'event':
			case 'period':
			case 'ignore':
				if (!hasOwn(state.parse, optKey))
					state.parse[optKey] = create(state.parse, optKey);

				const rule = state.parse[optKey];
				if (['snippet', 'layout'].includes(optKey)) {
					collect(rule, arg.value, (v: any) =>
						optKey === 'snippet'
							? isRegExp(v) ? v : new RegExp(v)
							: isRegExp(v) ? v.source : v
					)
				} else {
					asArray(arg.value).forEach(elm => {
						if (isObject(elm)) Object.assign(rule, elm);
						else if (isString(elm)) rule[elm] = elm;
					})
				}
				break;

			case 'timeZone': {
				const zone = String(arg.value).toLowerCase();
				setProperty(state.config, 'timeZone', enums.TIMEZONE[zone] ?? arg.value);
				break;
			}

			case 'calendar':
				setProperty(state.config, 'calendar', String(arg.value));
				break;

			case 'locale':
				setProperty(state.config, 'locale', String(arg.value));
				break;

			case 'pivot':
				state.parse.pivot = Number(arg.value);
				break;

			case 'mode':
				state.parse.mode = String(arg.value);
				break;
		}
	});

	return state;
}
