// engine.alias.ts
// Alias Resolution Engine for Tempo
// Responsible for event/period alias mapping, collision detection, and snippet rebinding

import { asType } from '#library/type.library.js';
import type { Logify } from '#library/logify.class.js';
import * as t from '../tempo.type.js';

export type AliasTarget = string | number | Function
export interface AliasEngineOptions {
	parent?: AliasEngine | undefined;
	logger?: Logify | undefined;
	config?: t.Internal.Config | undefined;
}

export class AliasEngine {
	#parentEngine?: AliasEngineOptions["parent"];
	#logger?: AliasEngineOptions["logger"];
	#config?: AliasEngineOptions["config"];
	#scopePrefix: string;
	#eventAliasCount: number = 0;
	#periodAliasCount: number = 0;

	#eventMap: Map<string, AliasTarget> = new Map();
	#periodMap: Map<string, AliasTarget> = new Map();
	#eventCollisions: Map<string, AliasTarget[]> = new Map();
	#periodCollisions: Map<string, AliasTarget[]> = new Map();

	#aliasRegistry: Array<{
		type: 'event' | 'period',
		name: string,
		baseWord: string,
		target: AliasTarget,
		index: number,
		prefix: string,
		groupName: string
	}> = [];

	constructor(options: AliasEngineOptions = {}) {
		this.#parentEngine = options.parent;
		this.#logger = options.logger;
		this.#config = options.config;
		if (!this.#parentEngine) {
			this.#scopePrefix = '0';
		} else {
			this.#scopePrefix = `${Number(this.#parentEngine.#scopePrefix) + 1}`;
		}
	}

	static isAliasCollision(a: string, b: string): boolean {
		const left = a.trim().toLowerCase();
		const right = b.trim().toLowerCase();
		if (!left || !right) return false;
		if (left === right) return true;
		const baseLeft = AliasEngine.getBaseWord(left);
		const baseRight = AliasEngine.getBaseWord(right);
		if (!baseLeft || !baseRight) return false;
		return baseLeft === baseRight;
	}

	static getBaseWord(s: string): string {
		return s
			.replace(/\[[^\]]*\]\?/g, '')
			.replace(/.\?/g, '')
			.replace(/[^a-z0-9]/g, '');
	}

	registerEventAlias(name: string, target: AliasTarget): void {
		this.#registerAliasWithCollision(name, target, this.#eventMap, this.#eventCollisions, 'event');
		const index = this.#eventAliasCount++;
		const prefix = this.#scopePrefix;
		const groupName = `${prefix}evt${index}`;
		const baseWord = AliasEngine.getBaseWord(name);
		this.#aliasRegistry.push({ type: 'event', name, baseWord, target, index, prefix, groupName });
	}

	/**
	 * Register event aliases and return a regex string representing the full lineage of event aliases up the proto chain.
	 * Ensures that shadowed/collided baseNames are excluded from parent levels.
	 */
	registerEvents(events: [string, AliasTarget][]): string {
		for (const [name, target] of events)
			this.registerEventAlias(name, target);
		const patterns: string[] = [];
		const seenBaseNames = new Set<string>();
		let engine: AliasEngine | undefined = this;
		while (engine) {
			const localGroups = engine.#aliasRegistry
				.filter(a => a.type === 'event' && !seenBaseNames.has(a.baseWord))
				.map(a => {
					seenBaseNames.add(a.baseWord);
					return `(?<${a.groupName}>${a.name})`;
				})
				.join('|');
			if (localGroups) patterns.push(`(${localGroups})`);
			engine = engine.#parentEngine;
		}
		return patterns.join('|');
	}

	registerPeriodAlias(name: string, target: AliasTarget): void {
		this.#registerAliasWithCollision(name, target, this.#periodMap, this.#periodCollisions, 'period');
		const index = this.#periodAliasCount++;
		const prefix = this.#scopePrefix;
		const groupName = `${prefix}per${index}`;
		const baseWord = AliasEngine.getBaseWord(name);
		this.#aliasRegistry.push({ type: 'period', name, baseWord, target, index, prefix, groupName });
	}

	/**
	 * Register period aliases and return a regex string representing the full lineage of period aliases up the proto chain.
	 * Ensures that shadowed/collided baseNames are excluded from parent levels.
	 */
	registerPeriods(periods: [string, AliasTarget][]): string {
		for (const [name, target] of periods)
			this.registerPeriodAlias(name, target);
		const patterns: string[] = [];
		const seenBaseNames = new Set<string>();
		let engine: AliasEngine | undefined = this;
		while (engine) {
			const localGroups = engine.#aliasRegistry
				.filter(a => a.type === 'period' && !seenBaseNames.has(a.baseWord))
				.map(a => {
					seenBaseNames.add(a.baseWord);
					return `(?<${a.groupName}>${a.name})`;
				})
				.join('|');
			if (localGroups) patterns.push(`(${localGroups})`);
			engine = engine.#parentEngine;
		}
		return patterns.join('|');
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
			const parentAliases = type === 'event' ? parent.getAllEventAliases() : (parent as AliasEngine).getAllPeriodAliases();
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
			parent = parent.#parentEngine;
		}

		if (collisionDetected && this.#logger) {
			this.#logger.warn(this.#config,
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
			this.#aliasRegistry = this.#aliasRegistry.filter(a => a.type !== 'event');
			this.#eventAliasCount = 0;
		}
		if (!type || type === 'period') {
			this.#periodMap.clear();
			this.#periodCollisions.clear();
			this.#aliasRegistry = this.#aliasRegistry.filter(a => a.type !== 'period');
			this.#periodAliasCount = 0;
		}
	}

	getIndexedAliases(type: 'event' | 'period') {
		return this.#aliasRegistry
			.filter(a => a.type === type)
			.map(a => ({
				name: a.name,
				target: a.target,
				index: a.index,
				prefix: a.prefix,
				groupName: a.groupName
			}));
	}
}

