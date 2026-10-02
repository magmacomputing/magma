import type { ClockDriftState, NtpSyncOptions } from './types.js';

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

	constructor(options: NtpSyncOptions = {}) {
		this.#options = {
			server: options.server ?? '/api/time',
			syncInterval: options.syncInterval ?? 0,
			interceptFetch: options.interceptFetch ?? false,
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
		return Date.now() + this.#state.offsetMs;
	}

	/**
	 * Resets the clock calibration state back to zero.
	 */
	reset(): void {
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
		if (!target || typeof globalThis.fetch !== 'function')
			return this.drift;

		const t0 = performance.now();
		const localBefore = Date.now();

		try {
			let response = await fetch(target, {
				method: 'HEAD',
				cache: 'no-store',
			});

			// If HEAD method is not allowed by server (405), fallback to lightweight GET
			if (response.status === 405) {
				response = await fetch(target, {
					method: 'GET',
					cache: 'no-store',
				});
			}

			const t1 = performance.now();
			const rtt = t1 - t0;

			if (rtt > this.#options.maxAcceptableRttMs)
				return this.drift; // Discard high-latency / jittery samples

			const serverTimeMs = this.extractServerTime(response.headers);
			if (serverTimeMs === null)
				return this.drift;

			this.ingestSample(serverTimeMs, rtt, localBefore);
		} catch {
			// Network failures leave existing drift calibration intact
		}

		return this.drift;
	}

	/**
	 * Incorporates a raw server timestamp and round-trip duration sample into the drift state.
	 *
	 * @param serverTimeMs - Authoritative server timestamp in milliseconds
	 * @param rttMs - Measured network Round-Trip Time in milliseconds
	 * @param localBefore - Local Date.now() timestamp captured at request initiation
	 */
	ingestSample(serverTimeMs: number, rttMs: number, localBefore: number = Date.now() - rttMs): void {
		if (rttMs > this.#options.maxAcceptableRttMs) return;

		// Cristian's Algorithm:
		// Estimated server time when response is received = serverTimeMs + (rtt / 2)
		// Local time when response is received = localBefore + rtt
		// Offset = Estimated Server Time - Local Time = serverTimeMs - (localBefore + rtt / 2)
		const measuredOffset = serverTimeMs - (localBefore + (rttMs / 2));

		if (this.#state.sampleCount === 0) {
			this.#state = {
				offsetMs: Math.round(measuredOffset),
				uncertaintyMs: Math.round(rttMs / 2),
				lastSyncedAt: Date.now(),
				sampleCount: 1,
			};
		} else {
			// Exponential Moving Average (EMA) smoothing to dampen network jitter
			const smoothedOffset = (this.#options.alpha * measuredOffset) + ((1 - this.#options.alpha) * this.#state.offsetMs);
			const smoothedUncertainty = (this.#options.alpha * (rttMs / 2)) + ((1 - this.#options.alpha) * this.#state.uncertaintyMs);

			this.#state = {
				offsetMs: Math.round(smoothedOffset),
				uncertaintyMs: Math.round(smoothedUncertainty),
				lastSyncedAt: Date.now(),
				sampleCount: this.#state.sampleCount + 1,
			};
		}
	}

	/**
	 * Parses server timestamp from HTTP response headers.
	 * Priority 1: High-precision `Server-Timing: clock=<epochMs>` or `server_time=<epochMs>`
	 * Priority 2: Standard RFC 7231 `Date` header
	 */
	extractServerTime(headers: Headers): number | null {
		const serverTiming = headers.get('Server-Timing') || headers.get('server-timing');
		if (serverTiming) {
			const match = serverTiming.match(/(?:clock|server_time|time|epoch)=(\d+(?:\.\d+)?)/i);
			if (match && match[1]) {
				const val = parseFloat(match[1]);
				// Handle both seconds (e.g. 1727839200.123) and milliseconds (1727839200123)
				return val < 1e11 ? Math.round(val * 1000) : Math.round(val);
			}
		}

		const dateHeader = headers.get('Date') || headers.get('date');
		if (dateHeader) {
			const parsed = new Date(dateHeader).getTime();
			if (!Number.isNaN(parsed) && parsed > 0)
				return parsed;
		}

		return null;
	}

	/**
	 * Initializes periodic background re-synchronization if configured.
	 */
	startBackgroundSync(intervalMs: number): void {
		this.stopBackgroundSync();
		if (intervalMs > 0 && typeof globalThis.setInterval === 'function') {
			this.#syncTimer = setInterval(() => {
				this.sync().catch(() => {});
			}, intervalMs);
			if (typeof this.#syncTimer?.unref === 'function')
				this.#syncTimer.unref();
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
	}
}
