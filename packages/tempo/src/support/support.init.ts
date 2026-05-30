import '#library/temporal.polyfill.js';
import { enumify } from '#library/enumerate.library.js';
import { asArray } from '#library/coercion.library.js';
import { getDateTimeFormat, getHemisphere } from '#library/international.library.js';
import { normalizeUtcOffset } from '#library/temporal.library.js';
import { markConfig } from '#library/symbol.library.js';
import { asType } from '#library/type.library.js';
import { isString, isObject, isUndefined, isDefined, isRegExp } from '#library/assertion.library.js';
import { Pledge } from '#library/pledge.class.js';
import { ownEntries } from '#library/primitive.library.js';
import { decodeJWT } from '#library/utility.library.js';
import { getStorage } from '#library/storage.library.js';

import { getRuntime } from './support.runtime.js';
import { setProperty, setProperties, hasOwn, create, collect, normalizeLayoutOrder, resolveMonthDay, logError, logWarn } from './support.util.js';
import { sym, Token } from './support.symbol.js';
import { Match, Snippet, Layout, Event, Period, Ignore, Default } from './support.default.js';
import { STATE, LICENSE } from './support.enum.js';

import enums from './support.enum.js';
import * as t from '../tempo.type.js';
import type { Internal } from '../tempo.type.js';

/** @internal Initialise a Tempo state */
export function init(options: t.Options = {}, isGlobal = true, baseState?: t.Internal.State): t.Internal.State {
	const runtime = getRuntime();
	// Global init is intentionally idempotent after first hydration; late-loaded modules must use Tempo.extend().
	if (isGlobal && runtime.state && !baseState) return runtime.state;

	const { timeZone, calendar } = getDateTimeFormat();
	const state = (baseState ? Object.create(baseState) : {
		config: {},
		parse: {},
		userProvidedKeys: new Set<string>()
	}) as t.Internal.State;

	if (baseState)
		state.userProvidedKeys = new Set(baseState.userProvidedKeys);

	// 1. Establish the base parsing state
	const parseState: t.Internal.Parse = {
		token: Token,
		result: [],
		snippet: Object.assign({}, baseState?.parse.snippet ?? Snippet),
		layout: Object.assign({}, baseState?.parse.layout ?? Layout),
		event: Object.assign({}, baseState?.parse.event ?? Event),
		period: Object.assign({}, baseState?.parse.period ?? Period),
		ignore: baseState ? { ...baseState.parse.ignore } : Object.fromEntries(asArray(Ignore).map(w => [w, w])),
		monthDay: baseState ? {
			...baseState.parse.monthDay,
			locales: [...asArray(baseState.parse.monthDay.locales)],
			layouts: [...asArray(baseState.parse.monthDay.layouts)],
			timezones: { ...baseState.parse.monthDay.timezones },
			...(baseState.parse.monthDay.resolvedLocales ? {
				resolvedLocales: baseState.parse.monthDay.resolvedLocales.map((l: any) => ({ ...l, timeZones: [...l.timeZones] }))
			} : {})
		} : resolveMonthDay({}, Default.monthDay as any),
		planner: baseState ? {
			...(baseState.parse.planner.layoutOrder ? { layoutOrder: [...asArray<string | symbol>(baseState.parse.planner.layoutOrder)] } : {}),
			...(isDefined(baseState.parse.planner.preFilter) ? { preFilter: Boolean(baseState.parse.planner.preFilter) } : {}),
		} : {
			layoutOrder: [...asArray<string | symbol>(Default.planner?.layoutOrder ?? (Default as any).layoutOrder)],
			preFilter: Boolean(Default.planner?.preFilter ?? (Default as any).preFilter),
		},
		pivot: (baseState?.parse.pivot ?? Default.pivot) as any,
		mode: (baseState?.parse.mode ?? Default.mode) as any,
		lazy: false,
		pattern: new Map(baseState?.parse.pattern),
		...(baseState ? {
			...(isDefined(baseState.parse.isAnchored) ? { isAnchored: baseState.parse.isAnchored } : {}),
			...(isDefined(baseState.parse.anchor) ? { anchor: baseState.parse.anchor } : {}),
			...(isDefined(baseState.parse.format) ? { format: baseState.parse.format } : {}),
			...(isDefined(baseState.parse.term) ? { term: baseState.parse.term } : {}),
			...(isDefined(baseState.parse.guard) ? { guard: baseState.parse.guard } : {}),
		} : {})
	};

	state.parse = markConfig(parseState);

	// 2. Establish the base configuration options
	const configDefaults = Object.fromEntries(Object.entries(Default).filter(([key]) => enums.CONFIG.has(key)));
	if (isGlobal) {
		markConfig(Object.assign(state.config, configDefaults));
		const { timeZone, calendar } = getDateTimeFormat();
		setProperties(state.config, {
			calendar,
			timeZone,
			locale: (getDateTimeFormat() as any).locale ?? 'en-US',
			discovery: Symbol.keyFor(sym.$Tempo) as string,
			formats: enumify(STATE.FORMAT, false),
			sphere: getHemisphere(timeZone),
			scope: 'global',
			catch: options.catch ?? false,
			intl: {},
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
	} else if (baseState) {
		state.config = markConfig(Object.create(baseState.config));
		setProperties(state.config, {
			scope: 'local',
			catch: options.catch ?? (baseState.config as any).catch ?? false,
			intl: Object.create((baseState.config as any).intl || {}),
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
	} else {
		markConfig(Object.assign(state.config, configDefaults));
		setProperties(state.config, {
			calendar,
			timeZone,
			locale: (getDateTimeFormat() as any).locale ?? 'en-US',
			discovery: Symbol.keyFor(sym.$Tempo) as string,
			formats: enumify(STATE.FORMAT, false),
			sphere: getHemisphere(timeZone),
			scope: 'local',
			intl: {},
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
		if (isDefined(options.catch))
			setProperty(state.config, 'catch', options.catch);
	}

	// 3. Initialize registries that need objects
	state.OPTION = new Set(Object.keys(configDefaults));
	state.ZONED_DATE_TIME = new Set(['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone', 'calendar']);

	if (isGlobal) {
		runtime.state = state;

		// 4. Discovery Cascade (License)
		let key = options.license;

		if (!key) key = getStorage('TEMPO_LICENSE_KEY');
		if (!key) key = (globalThis as any).TEMPO_LICENSE_KEY;

		if (key) setLicense(state, key);
	}
	return state;
}

/** @internal helper to synchronously set the optimistic license state */
function setLicense(state: t.Internal.State, key: string) {
	const runtime = getRuntime();
	if (key) {
		const claims = decodeJWT(key);
		runtime.license.key = key;
		runtime.license.status = LICENSE.Pending;
		runtime.license.scopes = claims?.permissions || {};

		if (claims?.exp) runtime.license.expires = claims.exp;
		if (claims?.iat) runtime.license.issuedAt = claims.iat;
		if (claims?.iss) runtime.license.issuer = claims.iss;
		if (claims?.sub) runtime.license.subject = claims.sub;
		if (claims?.aud) runtime.license.audience = claims.aud;
		if (claims?.jti) runtime.license.jti = claims.jti;
		delete runtime.license.error; // 🚿 Clear previous error state

		const initialJti = runtime.license.jti;
		const initialKey = runtime.license.key;
		runtime.license.jws = new Pledge<Internal.LicensingModule>({
			tag: 'license',
			onResolve: (m) => {
				const validator = new m.Validator(runtime.license.key!);
				validator.verify().then((res: any) => {
					// 🛡️ Race Condition Guard: Only apply results if identity (JTI + Key) hasn't changed since we started
					if (runtime.license.jti !== initialJti || runtime.license.key !== initialKey) return;

					runtime.license.status = res.status;
					runtime.license.scopes = res.scopes;
					delete runtime.license.error; // 🚿 Clear error on every reckoning attempt
					if (res.error) runtime.license.error = res.error;
					if (res.expires) runtime.license.expires = res.expires;
					if (res.issuedAt) runtime.license.issuedAt = res.issuedAt;
					if (res.issuer) runtime.license.issuer = res.issuer;
					if (res.jti) runtime.license.jti = res.jti;

					if ([LICENSE.Revoked, LICENSE.Invalid].includes(res.status))
						logWarn(state.config, `⚠️ Tempo Licensing: ${res.error || 'Verification failed'}`);
				}).catch((err: any) => {
					if (runtime.license.jti !== initialJti || runtime.license.key !== initialKey) return;
					runtime.license.status = LICENSE.Invalid;
					runtime.license.error = err?.message || 'Verification rejected';
					logWarn(state.config, `⚠️ Tempo Licensing: ${runtime.license.error}`);
				});
			}
		});
	}
}

/** @internal Extend a Tempo state with new options (Shadowing) */
export function extendState(state: t.Internal.State, options: t.Options) {
	let patternsDirty = false;

	ownEntries(options).forEach(([optKey, optVal]) => {
		if (isUndefined(optVal)) return;

		state.userProvidedKeys.add(optKey);
		const arg = asType(optVal);

		switch (optKey) {
			case 'snippet':
			case 'layout':
			case 'event':
			case 'period':
			case 'ignore': {
				patternsDirty = true;
				if (!hasOwn(state.parse, optKey))
					state.parse[optKey] = create(state.parse, optKey);

				const rule = state.parse[optKey];
				if (['snippet', 'layout'].includes(optKey)) {
					collect(rule, arg.value, (v: any) => {
						if (optKey === 'snippet') {
							const pattern = isRegExp(v) ? v.source : String(v);
							// 🛡️ Security Check: Prevent catastrophic backtracking and malicious patterns
							if (pattern.length > 500) {
								logError(state.config, `[Tempo#extend] Snippet pattern too long (max 500 chars).`);
								return new RegExp(Match.escape(pattern));
							}
							if (Match.backtrack.test(pattern)) {
								logError(state.config, `[Tempo#extend] Snippet contains suspicious nested quantifiers.`);
								return new RegExp(Match.escape(pattern));
							}
							return new RegExp(pattern);
						}
						return isRegExp(v) ? v.source : v;
					});
				} else {
					asArray(arg.value).forEach(elm => {
						if (isObject(elm)) Object.assign(rule, elm);
						else if (isString(elm)) Object.assign(rule, { [elm]: elm });
					})
				}
				break;
			}

			case 'monthDay':
				state.parse.monthDay = resolveMonthDay(arg.value, state.parse.monthDay);
				break;

			case 'timeZone': {
				const zone = String(arg.value).toLowerCase();
				const resolvedZone = enums.TIMEZONE[zone] ?? normalizeUtcOffset(String(arg.value));
				setProperty(state.config, 'timeZone', resolvedZone);
				break;
			}

			case 'calendar':
				setProperty(state.config, 'calendar', String(arg.value));
				break;

			case 'locale':
				setProperty(state.config, 'locale', String(arg.value));
				break;

			case 'discovery':
				setProperty(state.config, 'discovery', arg.value);
				break;

			case 'formats':
				if (state.config.formats?.extend) {
					state.config.formats = state.config.formats.extend(arg.value) as t.FormatRegistry;
				} else {
					setProperty(state.config, 'formats', arg.value);
				}
				break;

			case 'sphere':
				setProperty(state.config, 'sphere', arg.value);
				break;

			case 'catch':
				setProperty(state.config, 'catch', Boolean(arg.value));
				break;

			case 'pivot': {
				const pivot = parseInt(String(arg.value));
				state.parse.pivot = (Number.isFinite(pivot) && pivot >= 0 && pivot <= 99) ? pivot : Default.pivot!;
				break;
			}

			case 'mode':
				state.parse.mode = arg.value;
				break;

			case 'intl':
				if (!isObject(state.config.intl)) setProperty(state.config, 'intl', {});
				state.config.intl = { ...state.config.intl, ...arg.value };
				break;

			case 'planner':
				if (isDefined(arg.value.layoutOrder)) state.parse.planner.layoutOrder = normalizeLayoutOrder(arg.value.layoutOrder);
				if (isDefined(arg.value.preFilter)) state.parse.planner.preFilter = Boolean(arg.value.preFilter);
				break;

			case 'layoutOrder':
				state.parse.planner.layoutOrder = normalizeLayoutOrder(arg.value);
				break;

			case 'preFilter':
				state.parse.planner.preFilter = Boolean(arg.value);
				break;

			case 'timeStamp': {
				const unit = (isString(arg.value) ? arg.value : arg.value?.unit)?.trim()?.toLowerCase();

				if (isUndefined(unit) || !['ss', 'ms', 'us', 'ns'].includes(unit)) {
					logError(state.config, `[Tempo#extend] Invalid timeStamp unit: ${String(unit ?? arg.value)}. Expected 'ss', 'ms', 'us', or 'ns'.`);
					break;
				}

				setProperty(state.config, optKey, unit);
				break;
			}

			case 'license': {
				const runtime = getRuntime();
				if (state !== runtime.state) {
					logWarn(state.config, `[Tempo#extend] Licensing is a global-only feature and cannot be set on local instances.`);
					break;
				}
				const key = String(arg.value);
				setLicense(state, key);
				break;
			}

			default:
				setProperty(state.config, optKey, arg.value);
				break;

		}
	});
}
