// engine.alias.ts
// Alias Resolution Engine for Tempo
// Responsible for event/period alias mapping, collision detection, and snippet rebinding

/**
 * AliasEngine Collision Policy:
 *
 * If an Event and a Period alias share the same base word (e.g., 'xmas'),
 * a warning is logged and only the Event alias is included in the regex pattern for parsing.
 * This ensures deterministic parsing and avoids ambiguous matches.
 *
 * Both aliases may still be registered and resolved, but only the Event alias will be matched
 * during parsing if a collision occurs. This is a best-effort approach and not entirely risk-free;
 * users should avoid such collisions when possible.
 */

import type { Nullable } from '#library/type.library.js';
import type { Logify } from '#library/logify.class.js';
import { isDefined, isFunction, isZonedDateTime } from '#library/assertion.library.js';
import { Match } from '#tempo/support';
import { ownEntries } from '#library/primitive.library.js';
import * as t from '../tempo.type.js';

export type AliasTarget = string | number | Function
type AliasType = 'evt' | 'per';
type AliasKey = `${AliasType}${number}_${number}`;
type State = Record<AliasKey, Registry>

export interface AliasResult {
	value: string;
	key: string;			// The original baseName (e.g. 'noon')
	type: AliasType;
	source: 'global' | 'local';
	isClock: boolean;
	isFunction: boolean;
}

export interface AliasEngineOptions {
	parent?: Nullable<AliasEngine>;
	logger?: Nullable<Logify>;
	config?: Nullable<t.Internal.Config>;
}
interface Registry {																				// information about each registered alias
	key?: AliasKey;
	name: string;
	target: AliasTarget;
	type: AliasType;
	baseWord: string;
	collision?: boolean;
	depth: number;
}

export class AliasEngine {
	static aliasPattern = /^(evt|per)(\d+)_(\d+)$/;
	static #idCounter = 0;

	static #getBaseWord(s: string): string {
		return s
			.toLowerCase()
			.replace(/\[[^\]]*\]\?/g, '')
			.replace(/.\?/g, '')
			.replace(/[^a-z0-9]/g, '');
	}

	#parent?: AliasEngineOptions["parent"];
	#logger?: AliasEngineOptions["logger"];
	#config?: AliasEngineOptions["config"];

	#depth: number;																						// the depth of this engine in the proto chain
	#count: Record<AliasType, number>;												// count of aliases registered at this level (used for indexing)														
	#state: State;																						// object that holds alias mappings, collisions, and registry for this engine 
	#words: Record<string, string>;														// object of base words for collision detection
	#id: number;
	#version = 0;

	get depth() {
		return this.#depth
	}
	get id() { return this.#id }
	get parent() { return this.#parent }

	constructor(options = {} as AliasEngineOptions) {
		this.#parent = options.parent ?? null;
		this.#logger = options.logger;
		this.#config = options.config;
		this.#id = AliasEngine.#idCounter++;

		if (this.#parent) {
			if (!(this.#parent instanceof AliasEngine))
				this.#logger?.error(this.#config, "Parent engine must be an instance of AliasEngine");

			this.#depth = this.#parent.#depth + 1;
			this.#state = Object.create(this.#parent.#state);			// create a new state object that inherits from the parent engine's state
			this.#words = Object.create(this.#parent.#words);			// create a new words object that inherits from the parent engine's words for collision detection
		} else {
			this.#depth = 0;
			this.#state = Object.create(null);										// initialize an empty state for the root engine (no parent)
			this.#words = Object.create(null);										// initialize an empty words object for the root engine (no parent)
		}

		this.#count = { evt: 0, per: 0 };
	}

	/**
	 * Register aliases and return a regex string representing the full lineage of aliases up the proto chain.  
	 * Ensures that shadowed/collided baseNames are excluded from parent levels.  
	 * Note that we track collisions across both Event and Period aliases in the same #words object, since they can
	 * collide with each other (e.g. "on" could be an event alias and a period alias,  
	 * which would cause confusion and unintended matches).
	 */
	registerAliases(type: AliasType, events: [string, AliasTarget][]) {
		for (const [name, target] of events) {
			const index = (this.#count[type]++);
			const aliasKey = `${type}${this.#depth}_${index}` as AliasKey;

			const baseWord = AliasEngine.#getBaseWord(name);
			const collision = baseWord in this.#words;						// check for collision with existing base words in this engine and parent engines

			if (collision && this.#logger)
				this.#logger.warn(this.#config,
					`[AliasEngine] Collision detected for ${type} alias "${name}". This may overwrite an existing alias.`
				);

			this.#words[baseWord] = name;													// track the base word for collision detection
			this.#state[aliasKey] = {
				name,																								// plain string or regex-like string
				target,																							// string, number, or function
				type,																								// 'evt' or 'per'
				baseWord,																						// used for collision detection
				collision,																					// needed ?
				depth: this.#depth,
			}
		}

		this.#version++;
		return this.getPatterns(type);
	}

	/**
	 * Build regex patterns for this engine and all parent engines, excluding shadowed/collided baseNames.  
	 * This ensures that if an alias is shadowed by a child engine,  
	 * it won't be included in the regex patterns of the parent engine,  
	 * preventing unintended matches and preserving the expected behavior of alias resolution.
	 */
	getPatterns(type: AliasType, seenBaseNames = new Set<string>()): string | undefined {
		const patterns: string[] = [];

		for (const [alias, register] of ownEntries(this.#state)) {
			if (register.type === type && !seenBaseNames.has(register.baseWord)) {
				seenBaseNames.add(register.baseWord);

				if (register.type === type)
					patterns.push(`(?<${alias}>${register.name})`);
			}
		}

		if (this.#parent) {
			const parentPatterns = this.#parent.getPatterns(type, seenBaseNames);
			if (parentPatterns) patterns.push(parentPatterns);
		}

		return patterns.join('|');
	}

	getVersion(): number {
		return this.#version + (this.#parent?.getVersion() ?? 0);
	}

	hasAlias(name: string, type?: AliasType) {
		return !(name in this.#state)
			? false
			: type
				? this.#state[name as AliasKey].type === type
				: true
	}

	resolveAlias(name: AliasKey, thisArg?: any): AliasResult | undefined {
		const register = this.getAlias(name);
		if (!register) return undefined;

		let value = '';
		const isFn = isFunction(register.target);

		if (isFunction(register.target)) {
			const result = register.target.call(thisArg);
			value = isDefined(result) ? result.toString() : '';
		} else {
			value = register.target.toString();
		}

		return {
			value,
			key: register.name,
			type: register.type,
			source: register.depth === 0 ? 'global' : 'local',
			isClock: Match.clock.test(value),
			isFunction: isFn
		};
	}

	getAlias(key: string): Registry | undefined {
		return this.#state[key as AliasKey] ?? this.#parent?.getAlias(key);
	}

	getAliases(type?: AliasType, recurse = false) {
		const aliases = [] as Registry[];

		ownEntries(this.#state)
			.filter(([_, register]) => !type || register.type === type)
			.forEach(([key, register]) => {
				aliases.push(Object.assign({}, { key }, register));
			});

		if (recurse && this.#parent)
			aliases.push(...this.#parent.getAliases(type, true));

		return aliases;
	}

	clear(type: AliasType) {
		this.#count[type] = 0;

		for (const registry in this.#state) {
			if (this.#state[registry as AliasKey].type === type) {
				delete this.#state[registry as AliasKey];
			}
		}
		this.#version++;
	}

}

