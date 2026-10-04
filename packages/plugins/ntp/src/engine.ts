import { isFunction, Finalizer } from '@magmacomputing/tempo/plugin/sdk';
import type { ClockDriftState, NtpSyncOptions } from './types.js';

const RE_SERVER_TIMING = /(?:clock|server_time|epoch)=(\d+(?:\.\d+)?)/i;

/**
 * ## ClockDriftEngine
 * Core synchronization engine implementing Cristian's Algorithm and Exponential Moving Average (EMA)
 * smoothing for network clock drift compensation.
 */
export class ClockDriftEngine {
	#state: ClockDriftState = {
		offsetMs: 0,
		uncertaintyMs: 0,
		lastSyncedAt: 0,
		sampleCount: 0,
	};

	#options: Required<NtpSyncOptions>;
	#syncTimer: any = null;
	#unregisterFinalizer: (() => boolean) | null = null;
	#activeSyncAbortController: AbortController | null = null;
	#isSyncing = false;
	#baselineNtpMs = 0;
	#baselinePerfNow = 0;

	constructor(options: NtpSyncOptions = {}) {
		this.#options = {
			server: options.server ?? '/api/time',
			syncInterval: options.syncInterval ?? 0,
			interceptFetch: options.interceptFetch ?? false,
			trustedOrigins: options.trustedOrigins ?? [],
			maxAcceptableRttMs: options.maxAcceptableRttMs ?? 1000,
			alpha: Math.min(1, Math.max(0.01, options.alpha ?? 0.3)),
		};
	}

	get [Symbol.toStringTag](): string {
		return 'Tempo.ClockDriftEngine';
	}

	/**
	 * Returns the current calculated clock drift state snapshot.
	 */
	get drift(): ClockDriftState {
		return { ...this.#state };
	}

	/**
	 * Returns the raw clock drift offset in milliseconds.
	 */
	get offset(): number {
		return this.#state.offsetMs;
	}

	/**
	 * Whether at least one valid synchronization sample has been successfully recorded.
	 */
	get isCalibrated(): boolean {
		return this.#state.sampleCount > 0;
	}

	/**
	 * Calculates the current calibrated epoch time in milliseconds.
	 */
	nowMs(): number {
		return (this.#state.sampleCount > 0 && this.#baselineNtpMs > 0 && isFunction(globalThis.performance?.now))
			? Math.round(this.#baselineNtpMs + (performance.now() - this.#baselinePerfNow))
			: Date.now() + this.#state.offsetMs;
	}

	/**
	 * Resets the clock calibration state back to zero.
	 */
	reset(): void {
		this.#baselineNtpMs = 0;
		this.#baselinePerfNow = 0;
		this.#state = {
			offsetMs: 0,
			uncertaintyMs: 0,
			lastSyncedAt: 0,
			sampleCount: 0,
		};
	}

	/**
	 * Actively requests a network timestamp from an endpoint to calibrate client clock drift.
	 *
	 * @param endpoint - Target HTTP endpoint URL (defaults to configured server)
	 * @returns The updated ClockDriftState
	 */
	async sync(endpoint?: string): Promise<ClockDriftState> {
		const target = endpoint || this.#options.server;
		if (!target || !isFunction(globalThis.fetch))
			return this.drift;

		let t0 = performance.now();
		let localBefore = Date.now();
		const timeoutMs = Math.max(3000, this.#options.maxAcceptableRttMs * 2);
		const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
		this.#activeSyncAbortController = controller;
		const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
		if (isFunction(timer?.unref)) timer.unref();

		try {
			const init: RequestInit = {
				method: 'HEAD',
				cache: 'no-store',
				headers: { 'X-Tempo-Sync': '1' },
			};
			if (controller) init.signal = controller.signal;

			let response = await fetch(target, init);

			// If HEAD method is not allowed by server (405), fallback to lightweight GET
			if (response.status === 405) {
				t0 = performance.now();
				localBefore = Date.now();
				response = await fetch(target, {
					...init,
					method: 'GET',
				});
				response.body?.cancel?.().catch(() => { });
			}

			const t1 = performance.now();
			const rtt = t1 - t0;

			if (rtt > this.#options.maxAcceptableRttMs)
				return this.drift;																	// Discard high-latency / jittery samples

			const extracted = this.extractServerTime(response.headers);
			if (extracted === null)
				return this.drift;

			this.ingestSample(extracted.timeMs, rtt, localBefore, extracted.isCoarse);
		} catch {
			// Network failures or timeouts leave existing drift calibration intact
		} finally {
			if (timer) clearTimeout(timer);
			if (this.#activeSyncAbortController === controller)
				this.#activeSyncAbortController = null;
		}

		return this.drift;
	}

	/**
	 * Incorporates a raw server timestamp and round-trip duration sample into the drift state.
	 *
	 * @param serverTimeMs - Authoritative server timestamp in milliseconds
	 * @param rttMs - Measured network Round-Trip Time in milliseconds
	 * @param localBefore - Local Date.now() timestamp captured at request initiation
	 * @param isCoarse - Whether the timestamp comes from a 1-second coarse source (adds 500ms uncertainty)
	 */
	ingestSample(serverTimeMs: number, rttMs: number, localBefore: number = Date.now() - rttMs, isCoarse: boolean = false): void {
		if (!Number.isFinite(serverTimeMs) || !Number.isFinite(rttMs) || !Number.isFinite(localBefore)) return;
		if (rttMs < 0 || rttMs > this.#options.maxAcceptableRttMs) return;

		// Cristian's Algorithm:
		// Estimated server time when response is received = serverTimeMs + (rtt / 2)
		// Local time when response is received = localBefore + rtt
		// Offset = Estimated Server Time - Local Time = serverTimeMs - (localBefore + rtt / 2)
		const measuredOffset = serverTimeMs - (localBefore + (rttMs / 2));
		const sampleUncertainty = (rttMs / 2) + (isCoarse ? 500 : 0);

		let finalOffset = measuredOffset;
		let finalUncertainty = sampleUncertainty;

		if (this.#state.sampleCount === 0) {
			this.#state = {
				offsetMs: Math.round(measuredOffset),
				uncertaintyMs: Math.round(sampleUncertainty),
				lastSyncedAt: Date.now(),
				sampleCount: 1,
			};
		} else {
			// Exponential Moving Average (EMA) smoothing to dampen network jitter
			finalOffset = (this.#options.alpha * measuredOffset) + ((1 - this.#options.alpha) * this.#state.offsetMs);
			finalUncertainty = (this.#options.alpha * sampleUncertainty) + ((1 - this.#options.alpha) * this.#state.uncertaintyMs);

			this.#state = {
				offsetMs: Math.round(finalOffset),
				uncertaintyMs: Math.round(finalUncertainty),
				lastSyncedAt: Date.now(),
				sampleCount: this.#state.sampleCount + 1,
			};
		}

		this.#baselineNtpMs = (localBefore + rttMs) + finalOffset;
		this.#baselinePerfNow = isFunction(globalThis.performance?.now) ? performance.now() : 0;
	}

	/**
	 * Parses server timestamp from HTTP response headers.
	 * Priority 1: High-precision `Server-Timing: clock=<epochMs>`, `server_time=<epochMs>`, or `epoch=<epochMs>`
	 * Priority 2: Standard RFC 7231 `Date` header
	 */
	extractServerTime(headers: Headers): { timeMs: number; isCoarse: boolean } | null {
		const serverTiming = headers.get('Server-Timing') || headers.get('server-timing');
		if (serverTiming) {
			const match = serverTiming.match(RE_SERVER_TIMING);
			if (match && match[1]) {
				const val = parseFloat(match[1]);
				// Handle both seconds (e.g. 1727839200.123) and milliseconds (1727839200123)
				const ms = val < 1e11 ? Math.round(val * 1000) : Math.round(val);
				if (Number.isFinite(ms) && ms >= 946684800000) return { timeMs: ms, isCoarse: false };
			}
		}

		const dateHeader = headers.get('Date') || headers.get('date');
		if (dateHeader) {
			const parsed = new Date(dateHeader).getTime();
			if (!Number.isNaN(parsed) && parsed >= 946684800000)
				return { timeMs: parsed, isCoarse: true };
		}

		return null;
	}

	/**
	 * Initializes periodic background re-synchronization if configured.
	 */
	startBackgroundSync(intervalMs: number): void {
		this.stopBackgroundSync();
		if (intervalMs > 0 && isFunction(globalThis.setInterval)) {
			const timer = setInterval(() => {
				if (this.#isSyncing) return;
				this.#isSyncing = true;
				this.sync()
					.finally(() => { this.#isSyncing = false; })
					.catch(() => { });
			}, intervalMs);
			if (isFunction(timer?.unref))
				timer.unref();

			this.#syncTimer = timer;
			this.#unregisterFinalizer = Finalizer.register(this, () => {
				if (timer) clearInterval(timer);
			});
		}
	}

	/**
	 * Stops active periodic background sync timers.
	 */
	stopBackgroundSync(): void {
		if (this.#syncTimer !== null) {
			clearInterval(this.#syncTimer);
			this.#syncTimer = null;
		}
		if (this.#unregisterFinalizer !== null) {
			this.#unregisterFinalizer();
			this.#unregisterFinalizer = null;
		}
		if (this.#activeSyncAbortController !== null) {
			this.#activeSyncAbortController.abort();
			this.#activeSyncAbortController = null;
		}
		this.#isSyncing = false;
	}

	/**
	 * Stops background synchronization and releases active timer resources.
	 */
	dispose(): void {
		this.stopBackgroundSync();
	}

	/**
	 * Explicit deterministic disposal (Dual-Layer Lifecycle Model).
	 */
	[Symbol.dispose](): void {
		this.dispose();
	}
}
