/**
 * A lightweight `Set`-compatible container that delegates `has()` lookups to a
 * parent Set/ScopedSet, but confines `add()` writes to its own-local storage.
 *
 * This mirrors JavaScript prototype-chain semantics:
 * - Values added to the parent are **visible** to the child via `has()`.
 * - Values added to the child are **isolated** from the parent;
 *   the parent Set is never modified by child `add()` calls.
 *
 * @example
 * const global = new Set(['a']);
 * const sandbox = new ScopedSet(global);
 * sandbox.has('a');   // true  (inherited from parent)
 * sandbox.add('b');
 * sandbox.has('b');   // true  (own-local)
 * global.has('b');    // false (never written to parent)
 */
export class ScopedSet<T> {
	readonly #own = new Set<T>();
	readonly #parent: Set<T> | ScopedSet<T> | undefined;

	constructor(parent?: Set<T> | ScopedSet<T>) {
		this.#parent = parent;
	}

	/** `true` if value is in own-local storage OR anywhere in the parent chain. */
	has(value: T): boolean {
		return this.#own.has(value) || (this.#parent?.has(value) ?? false);
	}

	/** Adds to own-local storage only — never propagates to the parent. */
	add(value: T): this {
		this.#own.add(value);
		return this;
	}

	/** Removes from own-local storage only. */
	delete(value: T): boolean {
		return this.#own.delete(value);
	}

	/** Clears own-local storage only. */
	clear(): void {
		this.#own.clear();
	}

	/** Number of own-local entries (does not include parent entries). */
	get size(): number { return this.#own.size; }

	forEach(cb: (value: T, value2: T, set: Set<T>) => void): void { this.#own.forEach(cb as any); }
	values(): IterableIterator<T> { return this.#own.values(); }
	keys(): IterableIterator<T> { return this.#own.keys(); }
	entries(): IterableIterator<[T, T]> { return this.#own.entries(); }
	
	[Symbol.iterator](): IterableIterator<T> { return this.#own[Symbol.iterator](); }
	get [Symbol.toStringTag](): string { return 'ScopedSet'; }
}
