import { definePlugin, type TempoPlugin, deepFreeze } from '@magmacomputing/tempo/plugin/sdk';
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

/**
 * Parses duration-like sync interval strings (e.g., '15m', '1h', '30s') into milliseconds.
 */
function parseIntervalMs(interval?: number | string): number {
	if (!interval) return 0;
	if (typeof interval === 'number') return Math.max(0, interval);
	const match = String(interval).trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/i);
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
		const options: NtpSyncOptions = (typeof rawOptions === 'object' && rawOptions !== null) ? rawOptions : {};
		const engine = new ClockDriftEngine(options);
		_globalNtpEngine = engine;

		const ntpNamespace: NtpNamespace = {
			now(timeZone?: string): Tempo {
				return new TempoClass(engine.nowMs(), timeZone);
			},
			sync(endpoint?: string): Promise<ClockDriftState> {
				return engine.sync(endpoint);
			},
			get drift(): ClockDriftState {
				return engine.drift;
			},
			get offset(): number {
				return engine.offset;
			},
			get isCalibrated(): boolean {
				return engine.isCalibrated;
			},
			reset(): void {
				engine.reset();
			},
		};

		// 1. Mount frozen, immutable static namespace on Tempo
		if (!TempoClass.ntp) {
			Object.defineProperty(TempoClass, 'ntp', {
				value: deepFreeze ? deepFreeze(ntpNamespace) : Object.freeze(ntpNamespace),
				writable: false,
				configurable: true,
				enumerable: false,
			});
		}

		// 2. Mount instance helper method
		if (!TempoClass.prototype.toNtpTime) {
			TempoClass.prototype.toNtpTime = function (this: Tempo): Tempo {
				const calibratedEpochMs = this.epoch.ms + engine.offset;
				return new TempoClass(calibratedEpochMs, this.tz);
			};
		}

		// 3. Setup passive fetch interception if enabled
		if (options.interceptFetch && !_fetchPatched && typeof globalThis.fetch === 'function') {
			_fetchPatched = true;
			const originalFetch = globalThis.fetch;
			globalThis.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
				const t0 = performance.now();
				const localBefore = Date.now();
				const response = await originalFetch.apply(this, args);
				const rtt = performance.now() - t0;

				try {
					if (response?.headers) {
						const serverTime = engine.extractServerTime(response.headers);
						if (serverTime !== null) {
							engine.ingestSample(serverTime, rtt, localBefore);
						}
					}
				} catch {
					// Silent fail on header inspection to avoid breaking application network flow
				}

				return response;
			};
		}

		// 4. Setup periodic background sync if interval provided
		const intervalMs = parseIntervalMs(options.syncInterval);
		if (intervalMs > 0) {
			engine.startBackgroundSync(intervalMs);
		}

		// 5. Fire initial asynchronous synchronization
		if (options.server) {
			engine.sync(options.server).catch(() => {});
		}
	},
});

export default NtpPlugin;
