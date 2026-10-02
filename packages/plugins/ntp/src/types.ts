import type { Tempo } from '@magmacomputing/tempo';

/**
 * ## NtpSyncOptions
 * Configuration options for the NTP & Clock Drift plugin.
 */
export interface NtpSyncOptions {
	/**
	 * Target HTTP endpoint for clock synchronization (e.g. '/api/time').
	 * The endpoint should return a `Date` or `Server-Timing: clock=<epochMs>` response header.
	 */
	server?: string;

	/**
	 * Optional periodic re-synchronization interval (e.g., '15m' or milliseconds).
	 */
	syncInterval?: number | string;

	/**
	 * Automatically intercept `globalThis.fetch` responses to passively calibrate clock drift.
	 * @default false
	 */
	interceptFetch?: boolean;

	/**
	 * Maximum acceptable Round-Trip Time (RTT) in milliseconds. Samples exceeding this threshold are discarded.
	 * @default 1000
	 */
	maxAcceptableRttMs?: number;

	/**
	 * Exponential Moving Average (EMA) smoothing weight factor between 0.0 and 1.0 for new samples.
	 * @default 0.3
	 */
	alpha?: number;
}

/**
 * ## ClockDriftState
 * Telemetry snapshot of the current clock drift and synchronization confidence.
 */
export interface ClockDriftState {
	/**
	 * Calculated clock offset in milliseconds:
	 * `serverTime = localTime + offsetMs`
	 */
	readonly offsetMs: number;

	/**
	 * Estimated network uncertainty in milliseconds: `±(RTT / 2)`
	 */
	readonly uncertaintyMs: number;

	/**
	 * Epoch timestamp in milliseconds of the last successful calibration.
	 */
	readonly lastSyncedAt: number;

	/**
	 * Total count of valid sync samples aggregated into the current drift offset.
	 */
	readonly sampleCount: number;
}

/**
 * ## NtpNamespace
 * Public static API attached to `Tempo.ntp`.
 */
export interface NtpNamespace {
	/**
	 * Creates a new Tempo instance calibrated to authoritative atomic/server time.
	 *
	 * @param timeZone - Optional IANA timezone identifier
	 * @returns A calibrated Tempo instance
	 */
	now(timeZone?: string): Tempo;

	/**
	 * Actively synchronizes clock drift against the configured or specified time endpoint.
	 *
	 * @param endpoint - Optional URL/endpoint override
	 * @returns A promise resolving to the updated ClockDriftState
	 */
	sync(endpoint?: string): Promise<ClockDriftState>;

	/**
	 * Telemetry snapshot of current clock drift and uncertainty bounds.
	 */
	readonly drift: ClockDriftState;

	/**
	 * The current clock drift offset in milliseconds (fast integer getter).
	 */
	readonly offset: number;

	/**
	 * Whether at least one valid network synchronization sample has been acquired.
	 */
	readonly isCalibrated: boolean;

	/**
	 * Resets the clock drift calibration state back to zero.
	 */
	reset(): void;
}
