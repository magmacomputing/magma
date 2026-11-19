import { Tempo } from '@magmacomputing/tempo';
import { Signify, isFunction, isText, onConfigChange, type ReadonlySignal } from '@magmacomputing/tempo/plugin/sdk';
import type { ConfigSignals, SignalsPluginOptions } from '../types/index.js';

let _localeState: Signify.State<string> | null = null;
let _timeZoneState: Signify.State<string> | null = null;
let _unsubscribeConfig: (() => void) | null = null;
let _fallbackLocale: string | undefined = undefined;
let _fallbackTimeZone: string | undefined = undefined;

/** Resolves a BCP 47 locale string (or supplier) with Intl runtime fallback. */
function resolveLocale(value: unknown, fallback?: string): string {
	const resolved = isFunction(value) ? value() : value;
	if (isText(resolved))
		return resolved;
	if (isText(fallback))
		return fallback;
	return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
}

/** Resolves an IANA time zone identifier (or supplier) with Intl runtime fallback. */
function resolveTimeZone(value: unknown, fallback?: string): string {
	const resolved = isFunction(value) ? value() : value;
	if (isText(resolved))
		return resolved;
	if (isText(fallback))
		return fallback;
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Lazily initializes the global config signal states and subscribes to `Tempo.init()` changes.
 * Zero top-level side effects occur until called.
 *
 * @internal
 */
export function initConfigSignals(
	options?: SignalsPluginOptions,
	config?: Record<string, any> | (() => Record<string, any> | undefined),
): void {
	if (isText(options?.locale))
		_fallbackLocale = options.locale;
	if (isText(options?.timeZone))
		_fallbackTimeZone = options.timeZone;

	const currentConfig = (typeof config === 'function' ? (config as () => Record<string, any> | undefined)() : config) ?? Tempo.config;
	const nextLocale = resolveLocale(currentConfig?.locale, _fallbackLocale);
	const nextTimeZone = resolveTimeZone(currentConfig?.timeZone, _fallbackTimeZone);

	if (!_localeState)
		_localeState = new Signify.State(nextLocale);
	else
		_localeState.set(nextLocale);

	if (!_timeZoneState)
		_timeZoneState = new Signify.State(nextTimeZone);
	else
		_timeZoneState.set(nextTimeZone);

	if (!_unsubscribeConfig) {
		_unsubscribeConfig = onConfigChange((cfg) => {
			_localeState?.set(resolveLocale(cfg?.locale, _fallbackLocale));
			_timeZoneState?.set(resolveTimeZone(cfg?.timeZone, _fallbackTimeZone));
		});
	}
}

/**
 * Returns a consumer-owned `ReadonlySignal<string>` that tracks `Tempo.config.locale`
 * and updates automatically whenever `Tempo.init()` changes the global locale.
 */
export function localeSignal(options?: SignalsPluginOptions): ReadonlySignal<string> {
	initConfigSignals(options);
	const state = _localeState!;
	return Signify.computed(() => state.get());
}

/**
 * Returns a consumer-owned `ReadonlySignal<string>` that tracks `Tempo.config.timeZone`
 * and updates automatically whenever `Tempo.init()` changes the global time zone.
 */
export function timeZoneSignal(options?: SignalsPluginOptions): ReadonlySignal<string> {
	initConfigSignals(options);
	const state = _timeZoneState!;
	return Signify.computed(() => state.get());
}

/**
 * Returns both reactive global configuration signals (`locale` and `timeZone`).
 */
export function createConfigSignals(options?: SignalsPluginOptions): ConfigSignals {
	return Object.freeze({
		locale: localeSignal(options),
		timeZone: timeZoneSignal(options),
	});
}

/**
 * Detaches the `onConfigChange` observer registered by config signals.
 * Useful for teardown in tests or micro-frontends.
 */
export function disposeConfigSignals(): void {
	if (_unsubscribeConfig) {
		_unsubscribeConfig();
		_unsubscribeConfig = null;
	}
}
