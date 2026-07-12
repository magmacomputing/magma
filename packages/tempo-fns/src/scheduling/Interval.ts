import type { Tempo } from '@magmacomputing/tempo';

export type TemporalPoint = Tempo | { epochNanoseconds: bigint };

function getNs(point: TemporalPoint | unknown): bigint {
	const ns = (point as any)?.epoch?.ns ?? (point as any)?.epochNanoseconds;
	if (typeof ns === 'bigint') return ns;
	throw new TypeError('Invalid TemporalPoint: missing epoch.ns or epochNanoseconds');
}

/** Represents a continuous span of time with start and end boundaries, supporting set operations. */
export class Interval<T extends TemporalPoint = TemporalPoint> {
	readonly #start: T;
	readonly #end: T;

	constructor(start: T, end: T) {
		const startNs = getNs(start);
		const endNs = getNs(end);

		if (endNs < startNs) {
			this.#start = end;
			this.#end = start;
		} else {
			this.#start = start;
			this.#end = end;
		}
		Object.freeze(this);
	}

	get start(): T {
		return this.#start;
	}

	get end(): T {
		return this.#end;
	}

	/** Returns true if the specified temporal point is within this interval */
	contains(point: TemporalPoint): boolean {
		const t = getNs(point);
		return t >= getNs(this.start) && t < getNs(this.end);
	}

	/** Returns true if this interval overlaps with another interval */
	overlaps(other: Interval<any>): boolean {
		return getNs(this.start) < getNs(other.end) && getNs(this.end) > getNs(other.start);
	}

	/** Returns true if this interval starts exactly when the other ends, or vice versa */
	abuts(other: Interval<any>): boolean {
		return getNs(this.end) === getNs(other.start) || getNs(this.start) === getNs(other.end);
	}

	/** Returns the intersection of this interval and another, or null if they do not overlap */
	intersection(other: Interval<any>): Interval<T> | null {
		if (!this.overlaps(other)) return null;
		const maxStart = getNs(this.start) > getNs(other.start) ? this.start : (other.start as T);
		const minEnd = getNs(this.end) < getNs(other.end) ? this.end : (other.end as T);
		return new Interval<T>(maxStart, minEnd);
	}

	/** Returns the union of this interval and another, or null if they do not overlap/abut */
	union(other: Interval<any>): Interval<T> | null {
		if (!this.overlaps(other) && !this.abuts(other)) return null;
		const minStart = getNs(this.start) < getNs(other.start) ? this.start : (other.start as T);
		const maxEnd = getNs(this.end) > getNs(other.end) ? this.end : (other.end as T);
		return new Interval<T>(minStart, maxEnd);
	}
}
