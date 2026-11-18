import {
	definePlugin,
	deepFreeze,
	hasOwn,
	isObject,
	type Interval,
	type Tempo,
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
import type {
	DisposableSignal,
	IntervalSignalOptions,
	IntervalSignalState,
	RelativeSignalOptions,
	SignalsPluginOptions,
	TempoSignalsNamespace,
} from './types/index.js';

/**
 * ## SignalsPlugin
 * Extends Tempo with reactive TC39 Signals (`Signify`) for global config
 * (`Tempo.signals.locale`, `Tempo.signals.timeZone`), adaptive relative-time
 * formatting (`tempo.toRelativeSignal()`), and boundary-scheduled interval
 * observation (`interval.toSignal()`).
 */
export const SignalsPlugin: TempoPlugin<SignalsPluginOptions> = definePlugin({
	name: 'signals',
	install(this: any, TempoClass: any, options?: SignalsPluginOptions) {
		const installedClass = TempoClass || this;

		const classOpts = installedClass.config?.pluginOptions?.signals ?? installedClass.config?.plugins?.signals;
		const effectiveOptions: SignalsPluginOptions = {
			...(isObject(classOpts) ? classOpts : {}),
			...(isObject(options) ? options : {}),
		};

		initConfigSignals(effectiveOptions, () => installedClass.config);

		if (!hasOwn(installedClass, 'signals')) {
			const signalsNamespace: TempoSignalsNamespace = {
				get locale() {
					return localeSignal();
				},
				get timeZone() {
					return timeZoneSignal();
				},
				relative: toRelativeSignal,
				interval: intervalSignal,
				dispose: disposeConfigSignals,
				[Symbol.dispose]: disposeConfigSignals,
			};

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
	},
});

export const signalsPlugin = SignalsPlugin;
export default SignalsPlugin;
