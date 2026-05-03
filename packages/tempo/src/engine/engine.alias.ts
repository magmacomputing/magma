// engine.alias.ts
// Alias Resolution Engine for Tempo
// Responsible for event/period alias mapping, collision detection, and snippet rebinding

import { asType } from '#library/type.library.js';
import type { Logify } from '#library/logify.class.js';

export type AliasTarget = string | number | Function

export interface AliasEngineOptions {
	parent?: AliasEngine | undefined;
	logger?: Logify | undefined;
}

export class AliasEngine {
	#parentEngine?: AliasEngineOptions["parent"];
	#logger?: AliasEngineOptions["logger"];

	constructor(options: AliasEngineOptions = {}) {
		this.#parentEngine = options.parent;
		this.#logger = options.logger;
	}

	/**
	 * Detect likely overlap between two alias keys/patterns (moved from Tempo)
	 */
	static isAliasCollision(a: string, b: string): boolean {
		const left = a.trim().toLowerCase();
		const right = b.trim().toLowerCase();

		if (!left || !right) return false;
		if (left === right) return true;

		// Extract the 'core' characters to determine if they conceptually target the same word
		const getBaseWord = (s: string) => s
			.replace(/\[[^\]]*\]\?/g, '')                         // remove optional character classes (e.g. [ -]?)
			.replace(/.\?/g, '')                                  // remove optional single characters (e.g. s?)
			.replace(/[^a-z0-9]/g, '');                           // remove all non-alphanumeric characters (regex metachars, spaces, hyphens)

		const baseLeft = getBaseWord(left);
		const baseRight = getBaseWord(right);

		if (!baseLeft || !baseRight) return false;

		return baseLeft === baseRight;
	}

	#eventMap: Map<string, AliasTarget> = new Map();
	#periodMap: Map<string, AliasTarget> = new Map();
	#eventCollisions: Map<string, AliasTarget[]> = new Map();
	#periodCollisions: Map<string, AliasTarget[]> = new Map();

	// Event alias management
	registerEventAlias(name: string, target: AliasTarget): void {
		this.#registerAliasWithCollision(name, target, this.#eventMap, this.#eventCollisions, 'event');
	}

	registerEvents(events: [string, AliasTarget][]): void {
		for (const [name, target] of events)
			this.registerEventAlias(name, target);
	}
	resolveEventAlias(name: string, thisArg?: any) {
		return this.#resolveAlias(name, this.#eventMap, thisArg);
	}
	hasEventAlias(name: string): boolean {
		return this.#eventMap.has(name);
	}
	getAllEventAliases(): Record<string, AliasTarget> {
		return Object.fromEntries(this.#eventMap.entries());
	}
	detectEventCollisions(): Record<string, AliasTarget[]> {
		return Object.fromEntries(this.#eventCollisions.entries());
	}

	// Period alias management
	registerPeriodAlias(name: string, target: AliasTarget): void {
		this.#registerAliasWithCollision(name, target, this.#periodMap, this.#periodCollisions, 'period');
	}

	registerPeriods(periods: [string, AliasTarget][]): void {
		for (const [name, target] of periods)
			this.registerPeriodAlias(name, target);
	}
	resolvePeriodAlias(name: string, thisArg?: any) {
		return this.#resolveAlias(name, this.#periodMap, thisArg);
	}
	hasPeriodAlias(name: string): boolean {
		return this.#periodMap.has(name);
	}
	getAllPeriodAliases(): Record<string, AliasTarget> {
		return Object.fromEntries(this.#periodMap.entries());
	}
	detectPeriodCollisions(): Record<string, AliasTarget[]> {
		return Object.fromEntries(this.#periodCollisions.entries());
	}

	// Shared logic
	#registerAliasWithCollision(
		name: string,
		target: AliasTarget,
		map: Map<string, AliasTarget>,
		collisions: Map<string, AliasTarget[]>,
		type: 'event' | 'period'
	) {
		let collisionDetected = false;
		// Check for local collisions using isAliasCollision
		for (const [existingName, existingTarget] of map.entries()) {
			if (
				existingTarget !== target &&
				AliasEngine.isAliasCollision(existingName, name)
			) {
				const existing = collisions.get(existingName) || [];
				collisions.set(
					existingName,
					Array.from(new Set([...existing, target, existingTarget]))
				);
				collisionDetected = true;
			}
		}

		// Check for parent collisions using isAliasCollision
		let parent = this.#parentEngine;
		while (parent) {
			const parentAliases = type === 'event' ? parent.getAllEventAliases() : parent.getAllPeriodAliases();
			for (const [parentName, parentTarget] of Object.entries(parentAliases)) {
				if (
					parentTarget !== target &&
					AliasEngine.isAliasCollision(parentName, name)
				) {
					const parentCollisions = collisions.get(parentName) || [];
					collisions.set(
						parentName,
						Array.from(new Set([...parentCollisions, target, parentTarget]))
					);
					collisionDetected = true;
				}
			}
			// Access parent's parent engine via a public way if possible, or keep it private if safe
			// Since we're in the same class, we can still use #parentEngine for the chain
			parent = parent.#parentEngine;
		}

		if (collisionDetected && this.#logger) {
			this.#logger.warn(
				`[AliasEngine] Potential Collision detected for ${type} alias "${name}". Multiple definitions found. This may shadow or overwrite an existing alias.`
			);
		}

		map.set(name, target);
	}

	#resolveAlias(name: string, map: Map<string, AliasTarget>, thisArg?: any): string | number {
		let currentEngine: AliasEngine | undefined = this;
		const isEvent = map === this.#eventMap;

		while (currentEngine) {
			const { type, value } = asType(map.get(name));
			switch (type) {
				case 'Function':
					return value.call(thisArg);

				case 'String':
				case 'Number':
					return value;

				default:
					currentEngine = currentEngine.#parentEngine;
					if (currentEngine)
						map = isEvent ? currentEngine.#eventMap : currentEngine.#periodMap;
			}
		}

		return name;
	}

	clear(type?: 'event' | 'period'): void {
		if (!type || type === 'event') {
			this.#eventMap.clear();
			this.#eventCollisions.clear();
		}
		if (!type || type === 'period') {
			this.#periodMap.clear();
			this.#periodCollisions.clear();
		}
	}
}
