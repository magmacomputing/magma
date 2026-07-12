import type { Tempo } from '@magmacomputing/tempo';

export class Interval {
	readonly #start: Tempo;
	readonly #end: Tempo;

	constructor(start: Tempo, end: Tempo) {
		const startNs = start.epoch.ns;
		const endNs = end.epoch.ns;

		if (endNs < startNs) {
			this.#start = end;
			this.#end = start;
		} else {
			this.#start = start;
			this.#end = end;
		}
		Object.freeze(this);
	}

	get start(): Tempo {
		return this.#start;
	}

	get end(): Tempo {
		return this.#end;
	}

	/** Returns true if the specified Tempo instance is within this interval */
	contains(tempo: Tempo): boolean {
		const t = tempo.epoch.ns;
		return t >= this.start.epoch.ns && t < this.end.epoch.ns;
	}

	/** Returns true if this interval overlaps with another interval */
	overlaps(other: Interval): boolean {
		return this.start.epoch.ns < other.end.epoch.ns && this.end.epoch.ns > other.start.epoch.ns;
	}

	/** Returns true if this interval starts exactly when the other ends, or vice versa */
	abuts(other: Interval): boolean {
		return this.end.epoch.ns === other.start.epoch.ns || this.start.epoch.ns === other.end.epoch.ns;
	}

	/** Returns the intersection of this interval and another, or null if they do not overlap */
	intersection(other: Interval): Interval | null {
		if (!this.overlaps(other)) return null;
		const maxStart = this.start.epoch.ns > other.start.epoch.ns ? this.start : other.start;
		const minEnd = this.end.epoch.ns < other.end.epoch.ns ? this.end : other.end;
		return new Interval(maxStart, minEnd);
	}

	/** Returns the union of this interval and another, or null if they do not overlap/abut */
	union(other: Interval): Interval | null {
		if (!this.overlaps(other) && !this.abuts(other)) return null;
		const minStart = this.start.epoch.ns < other.start.epoch.ns ? this.start : other.start;
		const maxEnd = this.end.epoch.ns > other.end.epoch.ns ? this.end : other.end;
		return new Interval(minStart, maxEnd);
	}
}
