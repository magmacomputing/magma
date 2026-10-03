import { definePlugin, type TempoPlugin, deepFreeze, isString, isNumber, isObject, isFunction } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';
import { ClockDriftEngine } from './engine.js';
import type { ClockDriftState, NtpNamespace, NtpSyncOptions } from './types.js';

export { ClockDriftEngine };
export type { ClockDriftState, NtpNamespace, NtpSyncOptions };

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		/**
		 * NTP and Clock Drift Synchronization namespace.
		 */
		const ntp: NtpNamespace;
	}

	interface Tempo {
		/**
		 * Converts the current Tempo instance to its calibrated NTP-adjusted timestamp representation.
		 *
		 * @returns A new Tempo instance offset by the current NTP clock drift
		 * @example
		 * ```ts
		 * const ntpAdjusted = tempo.toNtpTime();
		 * ```
		 */
		toNtpTime(): Tempo;
	}
}

const RE_INTERVAL = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/i;

/**
 * Parses duration-like sync interval strings (e.g., '15m', '1h', '30s') into milliseconds.
 */
function parseIntervalMs(interval?: number | string): number {
	if (!interval) return 0;
	if (isNumber(interval)) return Math.max(0, interval);

	const match = String(interval).trim().match(RE_INTERVAL);
	if (!match) return 0;

	const val = parseFloat(match[1] ?? '0');
	const unit = (match[2] || 'ms').toLowerCase();
	switch (unit) {
		case 's': return val * 1000;
		case 'm': return val * 60 * 1000;
		case 'h': return val * 3600 * 1000;
		case 'd': return val * 86400 * 1000;
		default: return val;
	}
}

let _globalNtpEngine: ClockDriftEngine | null = null;
let _fetchPatched = false;

/**
 * ## NtpPlugin
 * Tempo plugin providing client-server network time synchronization and monotonic clock drift compensation.
 *
 * Mounts the static `Tempo.ntp` namespace for atomic time queries (`Tempo.ntp.now()`, `Tempo.ntp.sync()`, `Tempo.ntp.drift`).
 */
export const NtpPlugin: TempoPlugin = definePlugin({
	name: 'ntp',
	install(TempoClass: any, rawOptions: NtpSyncOptions = {}) {
		const options: NtpSyncOptions = isObject(rawOptions) ? rawOptions : {};

		if (_globalNtpEngine)
			_globalNtpEngine.stopBackgroundSync();

		const engine = new ClockDriftEngine(options);
		_globalNtpEngine = engine;

		const getEngine = (): ClockDriftEngine => _globalNtpEngine ?? engine;

		const ntpNamespace: NtpNamespace = {
			now(timeZone?: string): Tempo {
				return new TempoClass(getEngine().nowMs(), isString(timeZone) ? { timeZone } : timeZone);
			},
			sync(endpoint?: string): Promise<ClockDriftState> {
				return getEngine().sync(endpoint);
			},
			get drift(): ClockDriftState {
				return getEngine().drift;
			},
			get offset(): number {
				return getEngine().offset;
			},
			get isCalibrated(): boolean {
				return getEngine().isCalibrated;
			},
			reset(): void {
				getEngine().reset();
			},
			dispose(): void {
				getEngine().dispose();
			},
			[Symbol.dispose](): void {
				getEngine()[Symbol.dispose]();
			},
		};

		// 1. Mount frozen, immutable static namespace on Tempo
		Object.defineProperty(TempoClass, 'ntp', {
			value: deepFreeze ? deepFreeze(ntpNamespace) : Object.freeze(ntpNamespace),
			writable: false,
			configurable: true,
			enumerable: false,
		});

		// 2. Mount instance helper method
		if (!TempoClass.prototype.toNtpTime) {
			TempoClass.prototype.toNtpTime = function (this: Tempo): Tempo {
				const calibratedEpochMs = this.epoch.ms + getEngine().offset;
				return new TempoClass(calibratedEpochMs, { timeZone: this.tz });
			};
		}

		// 3. Setup passive fetch interception if enabled
		if (options.interceptFetch && !_fetchPatched && isFunction(globalThis.fetch)) {
			_fetchPatched = true;
			const originalFetch = globalThis.fetch;
			globalThis.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
				const init = args[1];
				const isInternalSync = init?.headers && (
					(isFunction((init.headers as any).get) && (init.headers as any).get('X-Tempo-Sync')) ||
					('X-Tempo-Sync' in (init.headers as any))
				);

				const t0 = performance.now();
				const localBefore = Date.now();
				const response = await originalFetch.apply(this, args);
				const rtt = performance.now() - t0;

				try {
					if (!isInternalSync && response?.headers) {
						const activeEngine = getEngine();
						const extracted = activeEngine.extractServerTime(response.headers);
						if (extracted !== null)
							activeEngine.ingestSample(extracted.timeMs, rtt, localBefore, extracted.isCoarse);
					}
				} catch {
					// Silent fail on header inspection to avoid breaking application network flow
				}

				return response;
			};
		}

		// 4. Setup periodic background sync if interval provided
		const intervalMs = parseIntervalMs(options.syncInterval);
		if (intervalMs > 0)
			engine.startBackgroundSync(intervalMs);

		// 5. Fire initial asynchronous synchronization
		if (options.server)
			engine.sync(options.server).catch(() => { });
	},
});

export default NtpPlugin;
