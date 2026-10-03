import { definePlugin, type TempoPlugin, deepFreeze, isString, isNumber, isObject, isFunction } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';
import { ClockDriftEngine } from './engine.js';
import type { ClockDriftState, NtpNamespace, NtpSyncOptions, NtpOriginMatcher, NtpFetchFilter } from './types.js';

export { ClockDriftEngine };
export type { ClockDriftState, NtpNamespace, NtpSyncOptions, NtpOriginMatcher, NtpFetchFilter };

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

type FetchFn = typeof globalThis.fetch;

let _globalNtpEngine: ClockDriftEngine | null = null;
let _globalSyncOptions: NtpSyncOptions = {};
let _fetchPatched = false;
let _originalFetch: FetchFn | null = null;
let _installedFetchWrapper: FetchFn | null = null;

/**
 * Safely extracts a string URL from diverse fetch input types (string, URL, Request).
 */
function extractRequestUrl(input: unknown): string {
	if (isString(input)) return input;
	if (isObject(input)) {
		if ('url' in input && isString(input.url)) return input.url;
		if ('href' in input && isString(input.href)) return input.href;
		if (isFunction(input.toString)) {
			try {
				return input.toString();
			} catch {
				return '';
			}
		}
	}
	return '';
}

/**
 * Tests whether a request URL satisfies a single matching rule.
 */
function matchesRule(url: string, rule: string | RegExp | ((url: string) => boolean)): boolean {
	if (isFunction(rule)) {
		try {
			return Boolean(rule(url));
		} catch {
			return false;
		}
	}
	if (rule instanceof RegExp)
		return rule.test(url);

	if (isString(rule)) {
		try {
			const parsedUrl = new URL(url, 'http://localhost');

			// 1. If rule is a relative path prefix like '/api/'
			if (rule.startsWith('/')) {
				return parsedUrl.pathname.startsWith(rule);
			}

			// 2. If rule specifies an absolute origin or URL with scheme
			if (rule.includes('://') || rule.startsWith('//')) {
				const parsedRule = new URL(rule, 'http://localhost');
				if (parsedUrl.origin !== parsedRule.origin) {
					return false;
				}
				// If rule specifies only an origin, require exact origin match without leaking into other paths
				if (parsedRule.pathname === '/' || parsedRule.pathname === '') {
					return true;
				}
				// If rule specifies an explicit path, enforce path prefix matching
				return parsedUrl.pathname.startsWith(parsedRule.pathname);
			}

			// 3. If rule is a bare hostname or host (e.g. 'api.trusted.com')
			if (parsedUrl.host === rule || parsedUrl.hostname === rule) {
				return true;
			}
		} catch {
			return false;
		}
	}
	return false;
}

/**
 * Evaluates whether a request URL is authorized for passive clock drift calibration.
 */
function isUrlAllowed(
	url: string,
	interceptFetch?: NtpFetchFilter,
	trustedOrigins?: NtpOriginMatcher | readonly (string | RegExp)[],
): boolean {
	if (interceptFetch === false) return false;
	if (!interceptFetch && !trustedOrigins) return false;

	// 1. If explicit trustedOrigins is specified, it strictly dictates allowed requests
	if (trustedOrigins) {
		return (Array.isArray(trustedOrigins))
			? trustedOrigins.some((rule) => matchesRule(url, rule))
			: matchesRule(url, trustedOrigins as any);
	}

	// 2. If interceptFetch is boolean true, allow all (unrestricted legacy behavior)
	if (interceptFetch === true) return true;

	// 3. Otherwise interceptFetch itself acts as the origin filter
	return (Array.isArray(interceptFetch))
		? interceptFetch.some((rule) => matchesRule(url, rule))
		: matchesRule(url, interceptFetch as any);
}

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
		_globalSyncOptions = options;

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
				if (_fetchPatched) {
					if (_originalFetch && globalThis.fetch === _installedFetchWrapper)
						globalThis.fetch = _originalFetch;

					_fetchPatched = false;
					_originalFetch = null;
					_installedFetchWrapper = null;
				}
			},
			[Symbol.dispose](): void {
				this.dispose();
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

		// 3. Setup passive fetch interception if enabled (or activated via trustedOrigins)
		const shouldIntercept = options.interceptFetch !== false && (Boolean(options.interceptFetch) || Boolean(options.trustedOrigins));
		if (shouldIntercept && !_fetchPatched && isFunction(globalThis.fetch)) {
			_fetchPatched = true;
			_originalFetch = globalThis.fetch;
			const originalFetch = globalThis.fetch;
			const fetchWrapper = async function (this: any, ...args: Parameters<FetchFn>): Promise<Response> {
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
					const requestUrl = extractRequestUrl(args[0]);
					const isAllowed = isUrlAllowed(requestUrl, _globalSyncOptions.interceptFetch, _globalSyncOptions.trustedOrigins);

					if (!isInternalSync && isAllowed && response?.headers) {
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
			_installedFetchWrapper = fetchWrapper;
			globalThis.fetch = fetchWrapper;
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
