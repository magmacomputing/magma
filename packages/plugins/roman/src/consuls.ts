import { CONSULS } from './consuls.data.js';
import type { ConsularPair, ConsularFormatStyle } from './types.js';

/**
 * Returns the list of eponymous (ordinary) consuls for an astronomical year,
 * or undefined if the year has no recorded ordinary consuls (e.g. consular tribunes,
 * anarchy, or outside the Fasti consulares range 509 BCE–541 CE).
 *
 * @param year - Astronomical year (e.g. 0 for 1 BCE, -62 for 63 BCE, 2026)
 */
export function getConsulsByYear(year: number): readonly string[] | undefined {
	return CONSULS[year];
}

/**
 * Formats the eponymous consuls of a given year into a standard classical Latin consular dating formula.
 *
 * Examples:
 * - 63 BCE (-62): `"M. Tullio Cicerone, C. Antonio Hybrida coss."`
 * - 44 BCE (-43): `"C. Julio Caesare V, M. Antonio coss."`
 * - 541 CE (541): `"Anicio Fausto Albino Basilio cos."`
 *
 * @param year - Astronomical year (0 = 1 BCE, -62 = 63 BCE)
 * @param style - `'ablative'` (default, e.g. `"Cicerone et Antonio coss."`) or `'nominative'` (e.g. `"M. Tullius Cicero, C. Antonius Hybrida"`)
 */
export function formatConsuls(year: number, style: ConsularFormatStyle = 'ablative'): string | undefined {
	const consuls = CONSULS[year];
	if (!consuls || consuls.length === 0) return undefined;

	if (style === 'nominative') {
		return consuls.join(', ');
	}

	// Classical ablative absolute dating formula ("... coss." or "... cos.")
	const ablativeNames = consuls.map(toAblativeConsulName);
	const suffix = consuls.length > 1 ? 'coss.' : 'cos.';
	return `${ablativeNames.join(', ')} ${suffix}`;
}

/**
 * Transforms standard Latin consul names (nominative) into their traditional ablative case for dating formulas.
 * Handles common Roman praenomina, gentilicia, cognomina, and numerals.
 */
function toAblativeConsulName(name: string): string {
	return name.split(' ').map(token => {
		// Keep praenomen abbreviations (M., C., L., P., Sp., etc.) and Roman numerals (II, V, etc.)
		if (/^[A-Z]['a-z]?\.$/.test(token) || /^[IVXLCDM]+$/.test(token)) {
			return token;
		}

		// Declension rules for Latin masculine 2nd & 3rd declension cognomina / gentilicia
		// Cicero -> Cicerone, Antonius -> Antonio, Caesar -> Caesare
		if (token.endsWith('ius')) return token.slice(0, -3) + 'io';
		if (token.endsWith('us')) return token.slice(0, -2) + 'o';
		if (token.endsWith('o')) return token + 'ne'; // Cicero -> Cicerone, Scipio -> Scipione, Cato -> Catone
		if (token.endsWith('or')) return token + 'e'; // Censor -> Censore
		if (token.endsWith('ar')) return token + 'e'; // Caesar -> Caesare
		if (token.endsWith('er')) return token + 'o'; // Alexander -> Alexandro (if 2nd) or +e
		if (token.endsWith('as')) return token.slice(0, -2) + 'a'; // Agrippa (already ablative/nom -a)
		if (token.endsWith('es')) return token.slice(0, -2) + 'e';
		if (token.endsWith('is')) return token.slice(0, -2) + 'e';
		if (token.endsWith('x')) return token.slice(0, -1) + 'ce'; // Pollux -> Polluce, Felix -> Felice

		// Default: if ending with consonant, typically 3rd declension ablative in -e
		if (/[bcdfghjklmnpqrstvz]$/i.test(token)) {
			return token + 'e';
		}

		return token;
	}).join(' ');
}

/**
 * Searches the Fasti for a consul name substring and returns matching years.
 */
export function findConsulYears(nameQuery: string): ConsularPair[] {
	let query = nameQuery.trim().toLowerCase();
	if (!query) return [];

	// Normalise common ablative suffixes to match nominative catalog entries
	// Cicerone -> Cicero, Antonio -> Antonius/Antonio, Caesare -> Caesar
	const words = query.split(/\s+/).filter(w => !['et', 'ac', 'atque', 'coss', 'cos'].includes(w));
	if (words.length === 0) return [];

	const results: ConsularPair[] = [];
	for (const [yearStr, names] of Object.entries(CONSULS)) {
		const year = Number(yearStr);
		const fullNamesStr = names.join(' ').toLowerCase();

		// Check if all requested query words match anywhere in the consuls of this year
		const match = words.every(w => {
			if (fullNamesStr.includes(w)) return true;
			// 3rd declension nasal stems: Cicerone -> cicero, Scipione -> scipio, Catone -> cato
			if (w.endsWith('one') && fullNamesStr.includes(w.slice(0, -3) + 'o')) return true;
			// Strip 3rd declension ablative -e: Caesare -> caesar
			if (w.endsWith('e') && fullNamesStr.includes(w.slice(0, -1))) return true;
			// Strip 2nd declension ablative -o: Antonio -> antoni, Bruto -> brut
			if (w.endsWith('o') && fullNamesStr.includes(w.slice(0, -1))) return true;
			return false;
		});

		if (match) {
			results.push({
				year,
				consuls: names,
				formatted: formatConsuls(year)!,
			});
		}
	}
	return results.sort((a, b) => a.year - b.year);
}
