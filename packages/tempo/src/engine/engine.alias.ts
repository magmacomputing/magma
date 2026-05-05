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
import { isFunction } from '#library';
import { ownEntries } from '#library/primitive.library.js';
import * as t from '../tempo.type.js';

export type AliasTarget = string | number | Function
type AliasType = 'evt' | 'per';
type AliasKey = `${AliasType}${number}_${number}`;
type State = Record<AliasKey, Registry>

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
}

export class AliasEngine {
	static aliasPattern = /^(evt|per)(\d+)_(\d+)$/;

	static #getBaseWord(s: string): string {
		return s
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

	constructor(options = {} as AliasEngineOptions) {
		this.#parent = options.parent ?? null;
		this.#logger = options.logger;
		this.#config = options.config;

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
			const aliasKey = `${type}${this.#depth}_${this.#count[type]++}` as AliasKey;
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
			}
		}

		return this.getPatterns(type);
	}

	/**
	 * Build regex patterns for this engine and all parent engines, excluding shadowed/collided baseNames.  
	 * This ensures that if an alias is shadowed by a child engine,  
	 * it won't be included in the regex patterns of the parent engine,  
	 * preventing unintended matches and preserving the expected behavior of alias resolution.
	 */
	getPatterns(type: AliasType): string {
		const patterns: string[] = [];
		const seenBaseNames = new Set<string>();

		for (const alias in this.#state) {
			const register = this.#state[alias as AliasKey];

			if (!seenBaseNames.has(register.baseWord)) {
				seenBaseNames.add(register.baseWord);

				if (register.type === type)
					patterns.push(`(?<${alias}>${register.name})`);
			}
		}

		return patterns.join('|');
	}

	hasAlias(name: string, type?: AliasType) {
		return !(name in this.#state)
			? false
			: type
				? this.#state[name as AliasKey].type === type
				: true
	}

	resolveAlias(name: AliasKey, thisArg?: any) {
		const register = this.#state[name];
		if (!register) return name;

		return isFunction(register.target)
			? register.target.call(thisArg).toString()
			: register.target;
	}

	getAlias(key: string): Registry | undefined {
		return this.#state[key as AliasKey];
	}

	getAliases(type?: AliasType) {
		const aliases = [] as Registry[];

		ownEntries(this.#state)																	// just the entries at this depth
			.filter(([_, register]) => !type || register.type === type)
			.forEach(([key, register]) => {
				aliases.push(Object.assign({}, { key }, register));
			});

		return aliases;
	}

	clear(type: AliasType) {
		this.#count[type] = 0;

		for (const registry in this.#state) {
			if (this.#state[registry as AliasKey].type === type) {
				delete this.#state[registry as AliasKey];
			}
		}
	}

}

