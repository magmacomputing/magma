import {
	Tempo,
} from '@magmacomputing/tempo';
import {
	Signify,
	deepFreeze,
	defineProp,
	hasOwn,
	isFunction,
	isObject,
	isText,
	sym,
	type Interval,
	type TempoPlugin,
} from '@magmacomputing/tempo/plugin/sdk';
import {
	disposeConfigSignals,
	initConfigSignals,
	localeSignal,
	timeZoneSignal,
} from './core/config.js';
import { intervalSignal } from './functions/interval.js';
import { toRelativeSignal } from './functions/relative.js';
import { watchSystemConfig } from './functions/watch-system.js';
import type {
	DisposableSignal,
	IntervalSignalOptions,
	IntervalSignalState,
	RelativeSignalOptions,
	SignalsPluginOptions,
	TempoSignalsNamespace,
	WatchSystemConfigOptions,
} from './types/index.js';

function createSignalsPlugin(): TempoPlugin<SignalsPluginOptions> {
	const install = function (this: any, TempoClass: any, options?: SignalsPluginOptions) {
		const installedClass = TempoClass || this;

		const classOpts = installedClass.config?.pluginOptions?.signals ?? installedClass.config?.plugins?.signals;
		const effectiveOptions: SignalsPluginOptions = {
			...(isObject(classOpts) ? classOpts : {}),
			...(isObject(options) ? options : {}),
		};

		const isGlobalTempo = installedClass === Tempo;
		if (isGlobalTempo)
			initConfigSignals(effectiveOptions, () => installedClass.config);

		if (!hasOwn(installedClass, 'signals') && Object.isExtensible(installedClass)) {
			let signalsNamespace: TempoSignalsNamespace;
			if (isGlobalTempo) {
				signalsNamespace = {
					get locale() {
						return localeSignal();
					},
					get timeZone() {
						return timeZoneSignal();
					},
					relative: toRelativeSignal,
					interval: intervalSignal,
					watchSystem: watchSystemConfig,
					dispose: disposeConfigSignals,
					[Symbol.dispose]: disposeConfigSignals,
				};
			} else {
				const resolveSandboxLocale = (): string => {
					const raw = installedClass.config?.locale ?? effectiveOptions.locale;
					const loc = isFunction(raw) ? raw() : raw;
					const first = Array.isArray(loc) ? loc[0] : loc;
					return isText(first) ? first : (Intl.DateTimeFormat().resolvedOptions().locale || 'en');
				};
				const resolveSandboxTimeZone = (): string => {
					const raw = installedClass.config?.timeZone ?? effectiveOptions.timeZone;
					const tz = isFunction(raw) ? raw() : raw;
					return isText(tz) ? tz : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
				};
				const sbLocaleState = new Signify.State<string>(resolveSandboxLocale());
				const sbTimeZoneState = new Signify.State<string>(resolveSandboxTimeZone());

				const origInit = installedClass.init;
				if (isFunction(origInit)) {
					Object.defineProperty(installedClass, 'init', {
						value: function (this: any, ...args: any[]) {
							const res = origInit.apply(this, args);
							sbLocaleState.set(resolveSandboxLocale());
							sbTimeZoneState.set(resolveSandboxTimeZone());
							return res;
						},
						writable: true,
						configurable: true,
					});
				}

				signalsNamespace = {
					locale: Signify.computed(() => sbLocaleState.get()),
					timeZone: Signify.computed(() => sbTimeZoneState.get()),
					relative: (target, opts) => toRelativeSignal(target, { localeSource: signalsNamespace.locale, ...opts }),
					interval: intervalSignal,
					watchSystem: (opts?: WatchSystemConfigOptions) => watchSystemConfig({ ...opts, target: opts?.target ?? installedClass }),
					dispose: () => {},
					[Symbol.dispose]: () => {},
				};
			}

			Object.defineProperty(installedClass, 'signals', {
				value: deepFreeze(signalsNamespace),
				writable: false,
				configurable: true,
				enumerable: false,
			});
		}

		if (!hasOwn(installedClass.prototype, 'toRelativeSignal')) {
			installedClass.prototype.toRelativeSignal = function (
				this: Tempo,
				opts?: RelativeSignalOptions,
			): DisposableSignal<string> {
				if (!isGlobalTempo && !opts?.locale && (installedClass as any).signals?.locale)
					return toRelativeSignal(this, { ...opts, localeSource: (installedClass as any).signals.locale });
				return toRelativeSignal(this, opts);
			};
		}

		if (installedClass.Interval?.prototype && !hasOwn(installedClass.Interval.prototype, 'toSignal')) {
			installedClass.Interval.prototype.toSignal = function (
				this: Interval<any>,
				opts?: IntervalSignalOptions,
			): IntervalSignalState {
				return intervalSignal(this, opts);
			};
		}
	};

	const factory = (options?: SignalsPluginOptions) => ({
		name: 'signals',
		install,
		options,
		[sym.$PluginType]: 'plugin',
	});
	const result = Object.assign(factory, { install, [sym.$PluginType]: 'plugin' });
	defineProp(result, 'name', 'signals', 'configurable');
	return result as unknown as TempoPlugin<SignalsPluginOptions>;
}

/**
 * ## SignalsPlugin
 * Extends Tempo with reactive TC39 Signals (`Signify`) for global config
 * (`Tempo.signals.locale`, `Tempo.signals.timeZone`), adaptive relative-time
 * formatting (`tempo.toRelativeSignal()`), and boundary-scheduled interval
 * observation (`interval.toSignal()`).
 */
export const SignalsPlugin: TempoPlugin<SignalsPluginOptions> = createSignalsPlugin();

export const signalsPlugin = SignalsPlugin;
export default SignalsPlugin;
