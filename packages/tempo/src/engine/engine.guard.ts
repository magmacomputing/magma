import { isString, isSymbol } from '#library/assertion.library.js';
import { Match } from '#tempo/support/support.default.js';

/**
 * Interface for the Master Guard scanner.
 */
export interface MasterGuard {
	test(input: string): boolean;
}

/**
 * Create a new Master Guard scanner based on a list of allowed tokens.
 * 
 * @param words - List of strings or symbols that are valid in the current context.
 * @returns An object with a .test() method that performs a greedy scan-and-consume validation.
 */
export function createMasterGuard(words: (string | symbol)[]): MasterGuard {
	const wordsList = words
		.filter(w => isString(w) || (isSymbol(w) && !!w.description))
		.map(w => (isSymbol(w) ? w.description! : (w as string)).toLowerCase())
		.filter(Boolean);

	const allowedTokens = new Set(wordsList);

	let maxT = 0;
	for (const w of wordsList) if (w.length > maxT) maxT = w.length;
	const maxTokenLength = maxT;

	return {
		test(input: string): boolean {
			if (!input || !isString(input)) return false;

			let i = 0;
			const len = input.length;
			let matchedAny = false;

			while (i < len) {
				const char = input[i];

				// 1. Skip spaces
				if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
					i++;
					continue;
				}

				// 2. Try Bracket match (starts with [)
				if (char === '[') {
					const sub = input.substring(i);
					const match = sub.match(Match.bracket);
					if (match && match.index === 0) {
						i += match[0].length;
						matchedAny = true;
						continue;
					}
				}

				// 3. Try Longest Token match from Set
				let matched = false;
				const searchLen = Math.min(maxTokenLength, len - i);
				const slice = input.substring(i, i + searchLen).toLowerCase();

				for (let l = searchLen; l > 0; l--) {
					const candidate = slice.substring(0, l);
					if (allowedTokens.has(candidate)) {
						i += l;
						matched = true;
						matchedAny = true;
						break;
					}
				}
				if (matched) continue;

				// 4. Try Fallback char (Match.guard)
				if (Match.guard.test(char)) {
					i++;
					matchedAny = true;
					continue;
				}

				return false;																				// No valid match at current position
			}

			return matchedAny;
		}
	};
}
