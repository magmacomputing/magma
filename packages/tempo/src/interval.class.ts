import type { Tempo } from './tempo.class.js';
import { Immutable } from '#library/class.library.js';

export type TemporalPoint = Tempo | { epochNanoseconds: bigint };

// Tempo limits (Year 1000 to Year 9999) used for open-ended boundaries
const MIN_TEMPO = -30610224000000000000n;
const MAX_TEMPO = 253402300799999999999n;

function getNs(point: TemporalPoint | unknown): bigint {
	const ns = (point as any)?.epoch?.ns ?? (point as any)?.epochNanoseconds;
	if (typeof ns === 'bigint') return ns;
	throw new TypeError('Invalid TemporalPoint: missing epoch.ns or epochNanoseconds');
}

/** Represents a continuous span of time with start and end boundaries, supporting set operations. */
@Immutable
export class Interval<T extends TemporalPoint = TemporalPoint> {
	readonly #start: T | null;
	readonly #end: T | null;
	readonly #startNs: bigint;
	readonly #endNs: bigint;

	constructor(start: T | null, end: T | null) {
		const startNs = start === null ? MIN_TEMPO : getNs(start);
		const endNs = end === null ? MAX_TEMPO : getNs(end);

		if (endNs < startNs) {
			this.#start = end;
			this.#end = start;
			this.#startNs = endNs;
			this.#endNs = startNs;
		} else {
			this.#start = start;
			this.#end = end;
			this.#startNs = startNs;
			this.#endNs = endNs;
		}

		return Object.freeze(this) as this;
	}

	get [Symbol.toStringTag]() {
		return 'Tempo.Interval';
	}

	get start(): T | null {
		return this.#start;
	}

	get end(): T | null {
		return this.#end;
	}

	get startNs(): bigint {
		return this.#startNs;
	}

	get endNs(): bigint {
		return this.#endNs;
	}

	/** Returns true if the specified temporal point is within this interval */
	contains(point: TemporalPoint): boolean {
		const t = getNs(point);
		return t >= this.#startNs && t < this.#endNs;
	}

	/** Returns true if this interval overlaps with another interval */
	overlaps(other: Interval<any>): boolean {
		return this.#startNs < other.#endNs && this.#endNs > other.#startNs;
	}

	/** Returns true if this interval starts exactly when the other ends, or vice versa */
	abuts(other: Interval<any>): boolean {
		return this.#endNs === other.#startNs || this.#startNs === other.#endNs;
	}

	/** Returns the intersection of this interval and another, or null if they do not overlap */
	intersection(other: Interval<any>): Interval<T> | null {
		if (!this.overlaps(other)) return null;
		const maxStart = this.#startNs > other.#startNs ? this.#start : (other.#start as T | null);
		const minEnd = this.#endNs < other.#endNs ? this.#end : (other.#end as T | null);
		return new Interval<T>(maxStart, minEnd);
	}

	/** Returns the union of this interval and another, or null if they do not overlap/abut */
	union(other: Interval<any>): Interval<T> | null {
		if (!this.overlaps(other) && !this.abuts(other)) return null;
		const minStart = this.#startNs < other.#startNs ? this.#start : (other.#start as T | null);
		const maxEnd = this.#endNs > other.#endNs ? this.#end : (other.#end as T | null);
		return new Interval<T>(minStart, maxEnd);
	}
}
