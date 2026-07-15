import { definePlugin } from '@magmacomputing/tempo/plugin-api';
import type { Tempo } from '@magmacomputing/tempo/core';

type SnapKey = 
	| 'hh' | 'hours' | 'hour' 
	| 'mi' | 'minutes' | 'minute' 
	| 'ss' | 'seconds' | 'second' 
	| 'ms' | 'milliseconds' | 'millisecond' 
	| 'us' | 'microseconds' | 'microsecond' 
	| 'ns' | 'nanoseconds' | 'nanosecond';

/** Utility type that enforces exactly one key from the union */
type OneKey<K extends keyof any, V, KK extends keyof any = K> =
	{ [P in K]: { [Q in P]: V } &
	{ [Q in Exclude<KK, P>]?: undefined } extends infer O ?
		{ [Q in keyof O]: O[Q] } : never
	}[K];

type SnapOptions = OneKey<SnapKey, number> & { direction?: 'up' | 'down' };

export const SnapPlugin = definePlugin({
	name: 'snap',
	install(TempoClass: any) {
		TempoClass.prototype.snap = function (this: Tempo, options?: SnapOptions) {
			let base: Tempo = this;
			const opts = (options && Object.keys(options).length > 0) ? options : { mi: 15 };

			const direction = opts.direction;
			const providedKeys = (Object.keys(opts) as (SnapKey | 'direction')[]).filter(k => k !== 'direction' && opts[k as keyof SnapOptions] !== undefined) as SnapKey[];

			if (providedKeys.length > 1) {
				const err = new Error(`Snap options can only contain a single time component. Found: ${providedKeys.join(', ')}`);
				if (this.config?.catch) {
					console.error(`[Tempo] Error: ${err.message}`);
					return this;
				}
				throw err;
			}

			const key = providedKeys[0];
			let step = opts[key as keyof SnapOptions] as number;

			if (!Number.isFinite(step) || step === 0) {
				const err = new Error(`Snap step cannot be zero or non-finite.`);
				if (this.config?.catch) {
					console.error(`[Tempo] Error: ${err.message}`);
					return this;
				}
				throw err;
			}

			step = Math.abs(step);

			const calculateRounded = (fractional: number, stepSize: number, dir?: 'up' | 'down') => {
				if (dir === 'up') return Math.ceil(fractional / stepSize) * stepSize;
				if (dir === 'down') return Math.floor(fractional / stepSize) * stepSize;
				return Math.round(fractional / stepSize) * stepSize;
			};

			switch (key) {
				case 'hh':
				case 'hour':
				case 'hours': {
					const fractionalHour = base.hh + (base.mi / 60) + (base.ss / 3_600) + (base.ms / 3_600_000) + (base.us / 3_600_000_000) + (base.ns / 3_600_000_000_000);
					const roundedHour = calculateRounded(fractionalHour, step, direction);
					const diff = roundedHour - base.hh;

					base = base.set({ mi: 0, ss: 0, ms: 0, us: 0, ns: 0 });

					if (diff !== 0) base = base.add({ hours: diff });
					break;
				}

				case 'mi':
				case 'minute':
				case 'minutes': {
					const fractionalMinute = base.mi + (base.ss / 60) + (base.ms / 60_000) + (base.us / 60_000_000) + (base.ns / 60_000_000_000);
					const roundedMinute = calculateRounded(fractionalMinute, step, direction);
					const diff = roundedMinute - base.mi;

					base = base.set({ ss: 0, ms: 0, us: 0, ns: 0 });

					if (diff !== 0) base = base.add({ minutes: diff });
					break;
				}

				case 'ss':
				case 'second':
				case 'seconds': {
					const fractionalSecond = base.ss + (base.ms / 1_000) + (base.us / 1_000_000) + (base.ns / 1_000_000_000);
					const roundedSecond = calculateRounded(fractionalSecond, step, direction);
					const diff = roundedSecond - base.ss;

					base = base.set({ ms: 0, us: 0, ns: 0 });

					if (diff !== 0) base = base.add({ seconds: diff });
					break;
				}

				case 'ms':
				case 'millisecond':
				case 'milliseconds': {
					const fractionalMs = base.ms + (base.us / 1_000) + (base.ns / 1_000_000);
					const roundedMs = calculateRounded(fractionalMs, step, direction);
					const diff = roundedMs - base.ms;

					base = base.set({ us: 0, ns: 0 });

					if (diff !== 0) base = base.add({ milliseconds: diff });
					break;
				}

				case 'us':
				case 'microsecond':
				case 'microseconds': {
					const fractionalUs = base.us + (base.ns / 1_000);
					const roundedUs = calculateRounded(fractionalUs, step, direction);
					const diff = roundedUs - base.us;

					base = base.set({ ns: 0 });

					if (diff !== 0) base = base.add({ microseconds: diff });
					break;
				}

				case 'ns':
				case 'nanosecond':
				case 'nanoseconds': {
					const roundedNs = calculateRounded(base.ns, step, direction);
					const diff = roundedNs - base.ns;

					if (diff !== 0) base = base.add({ nanoseconds: diff });
					break;
				}

				default: {
					const err = new Error(`Invalid snap unit: '${key}'. Only time components (hours, minutes, seconds, milliseconds, microseconds, nanoseconds) are supported. Date components are not allowed.`);
					if (this.config?.catch) {
						console.error(`[Tempo] Error: ${err.message}`);
						return this;
					}
					throw err;
				}
			}

			return base;
		}
	}
});

declare module '@magmacomputing/tempo/core' {
	interface Tempo {
		/** 
		 * Snaps the time to the nearest given interval for the specified unit.
		 * 
		 * @example t.snap() // Snaps to nearest 15 minutes (default)
		 * @example t.snap({ hh: 1 }) // Snaps to nearest hour
		 * @example t.snap({ ss: 30 }) // Snaps to nearest 30 seconds
		 */
		snap(options?: SnapOptions): Tempo;
	}
}
