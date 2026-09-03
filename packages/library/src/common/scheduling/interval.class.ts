import { isInteger } from '../primitives/assertion.library.js';
import { Immutable, StringTag } from '../runtime/decorator.library.js';

export type TemporalPoint = { epoch?: { ns: bigint } } | { epochNanoseconds: bigint } | any;

/**
 * Extracts epoch nanoseconds from a temporal point.
 *
 * @internal
 * @param point - The value containing epoch nanoseconds.
 * @returns The epoch nanoseconds.
 * @throws `TypeError` if the value does not contain an integer epoch nanosecond value.
 */
function getNs(point: TemporalPoint | unknown): bigint {
	const ns = (point as any)?.epoch?.ns ?? (point as any)?.epochNanoseconds;
	if (isInteger(ns)) return ns;
	throw new TypeError('Invalid TemporalPoint: missing epoch.ns or epochNanoseconds');
}

/** Represents a continuous span of time with optional start and end boundaries, supporting set operations. */
@Immutable
@StringTag('Interval')
export class Interval<T extends TemporalPoint = TemporalPoint> {
	readonly #start: T | null;
	readonly #end: T | null;
	readonly #startNs: bigint | number;
	readonly #endNs: bigint | number;

	constructor(start: T | null, end: T | null) {
		const startNs = start === null ? -Infinity : getNs(start);
		const endNs = end === null ? Infinity : getNs(end);

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

	/** The start point of the interval, or null for unbounded start */
	get start(): T | null {
		return this.#start;
	}

	/** The end point of the interval, or null for unbounded end */
	get end(): T | null {
		return this.#end;
	}

	/** The start time in nanoseconds since epoch, or -Infinity for unbounded start */
	get startNs(): bigint | number {
		return this.#startNs;
	}

	/** The end time in nanoseconds since epoch, or Infinity for unbounded end */
	get endNs(): bigint | number {
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
	intersection<U extends TemporalPoint = T>(other: Interval<U>): Interval<T | U> | null {
		if (!this.overlaps(other)) return null;
		const maxStart = this.#startNs > other.#startNs ? this.#start : other.#start;
		const minEnd = this.#endNs < other.#endNs ? this.#end : other.#end;
		return new Interval<T | U>(maxStart, minEnd);
	}

	/** Returns the union of this interval and another, or null if they do not overlap/abut */
	union<U extends TemporalPoint = T>(other: Interval<U>): Interval<T | U> | null {
		if (!this.overlaps(other) && !this.abuts(other)) return null;
		const minStart = this.#startNs < other.#startNs ? this.#start : other.#start;
		const maxEnd = this.#endNs > other.#endNs ? this.#end : other.#end;
		return new Interval<T | U>(minStart, maxEnd);
	}
}
