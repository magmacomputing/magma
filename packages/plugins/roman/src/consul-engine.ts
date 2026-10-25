import type { ConsularPair, ConsularFormatStyle } from './types.js';

/**
 * Curated seed catalog of landmark Roman consular years.
 *
 * Provides out-of-the-box consular dating for major classical historical milestones
 * without incurring the bundle cost of the entire 1,050-year Fasti consulares table.
 *
 * To load the complete 1,050-year Fasti consulares (509 BCE – 541 CE), import:
 * ```ts
 * import '@magmacomputing/tempo-plugin-roman/consuls';
 * ```
 */
export const LANDMARK_CONSULS: Readonly<Record<number, readonly string[]>> = Object.freeze({
	// 509 BCE: Founding of the Republic
	'-508': ['L. Junius Brutus', 'L. Tarquinius Collatinus'],
	// 321 BCE: Second Samnite War / Caudine Forks
	'-320': ['T. Veturius Calvinus II', 'Sp. Postumius Albinus Caudinus II'],
	// 280 BCE: Pyrrhic War
	'-279': ['P. Valerius Laevinus', 'Ti. Coruncanius'],
	// 216 BCE: Second Punic War / Cannae
	'-215': ['C. Terentius Varro', 'L. Aemilius Paullus II'],
	// 202 BCE: Second Punic War / Zama
	'-201': ['M. Servilius Pulex Geminus', 'Ti. Claudius Nero'],
	// 133 BCE: Tribunate of Tiberius Gracchus
	'-132': ['P. Mucius Scaevola', 'L. Calpurnius Piso Frugi'],
	// 107 BCE: First consulship of Gaius Marius
	'-106': ['C. Marius I', 'L. Cassius Longinus'],
	// 63 BCE: Consulship of Cicero, Catilinarian conspiracy
	'-62': ['M. Tullius Cicero', 'C. Antonius Hybrida'],
	// 59 BCE: First consulship of Julius Caesar ("Julius and Caesar")
	'-58': ['C. Julius Caesar', 'M. Calpurnius Bibulus'],
	// 55 BCE: Second consulship of Pompey and Crassus
	'-54': ['Cn. Pompeius Magnus II', 'M. Licinius Crassus II'],
	// 48 BCE: Battle of Pharsalus
	'-47': ['C. Julius Caesar II', 'P. Servilius Isauricus'],
	// 44 BCE: Assassination of Julius Caesar (Ides of March)
	'-43': ['C. Julius Caesar V', 'M. Antonius'],
	// 43 BCE: Formation of the Second Triumvirate
	'-42': ['C. Vibius Pansa Caetronianus', 'A. Hirtius'],
	// 31 BCE: Battle of Actium
	'-30': ['M. Antonius III', 'Imp. Caesar III'],
	// 28 BCE: Octavian and Agrippa
	'-27': ['Imp. Caesar VI', 'M. Agrippa II'],
	// 27 BCE: Establishment of the Principate (Augustus)
	'-26': ['Imp. Caesar Augustus VII', 'M. Agrippa III'],
	// 14 CE: Death of Augustus, accession of Tiberius
	'14': ['Sex. Pompeius', 'Sex. Appuleius'],
	// 69 CE: Year of the Four Emperors
	'69': ['Ser. Galba Caesar Augustus II', 'T. Vinius'],
	// 541 CE: Last ordinary consul in the West
	'541': ['Anicius Faustus Albinus Basilius'],
});

const CONSULAR_REGISTRY_SYMBOL = Symbol.for('@magmacomputing/tempo-plugin-roman/consuls');

/**
 * Accesses the global shared consular catalog dictionary across all module boundaries.
 */
function getRegistry(): Record<number, readonly string[]> {
	const g = globalThis as any;
	if (!g[CONSULAR_REGISTRY_SYMBOL]) {
		g[CONSULAR_REGISTRY_SYMBOL] = { ...LANDMARK_CONSULS };
	}
	return g[CONSULAR_REGISTRY_SYMBOL];
}

/**
 * Registers an external consular catalog (such as the full Fasti consulares) into the active catalog.
 *
 * @param catalog - Mapping of astronomical years to arrays of consul names
 */
export function registerConsuls(catalog: Record<number, readonly string[]>): void {
	const registry = getRegistry();
	Object.assign(registry, catalog);
}

/**
 * Returns the currently active consular catalog dictionary.
 */
export function getConsulCatalog(): Readonly<Record<number, readonly string[]>> {
	return getRegistry();
}

/**
 * Resets the consular catalog back to the default landmark seed table.
 */
export function resetConsulCatalog(): void {
	const g = globalThis as any;
	g[CONSULAR_REGISTRY_SYMBOL] = { ...LANDMARK_CONSULS };
}

/**
 * Returns the list of eponymous (ordinary) consuls for an astronomical year,
 * or undefined if the year has no recorded ordinary consuls in the active catalog.
 *
 * By default, the plugin includes a curated seed table of landmark historical years
 * (e.g. 509 BCE, 63 BCE Cicero, 44 BCE Caesar, 541 CE Basilius).
 * To load the complete 1,050-year Fasti consulares (509 BCE–541 CE), import:
 * ```ts
 * import '@magmacomputing/tempo-plugin-roman/consuls';
 * ```
 *
 * @param year - Astronomical year (e.g. 0 for 1 BCE, -62 for 63 BCE, 2026)
 */
export function getConsulsByYear(year: number): readonly string[] | undefined {
	return getRegistry()[year];
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
	const consuls = getRegistry()[year];
	if (!consuls || consuls.length === 0) return undefined;

	if (style === 'nominative') {
		return consuls.join(', ');
	}

	// Classical ablative absolute dating formula ("... coss." or "... cos.")
	const ablativeNames = consuls.map(toAblativeConsulName);
	const suffix = consuls.length > 1 ? 'coss.' : 'cos.';
	return `${ablativeNames.join(', ')} ${suffix}`;
}

const ABLATIVE_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
	Pulex: 'Pulice',
	pulex: 'pulice',
});

/**
 * Transforms standard Latin consul names (nominative) into their traditional ablative case for dating formulas.
 * Handles common Roman praenomina, gentilicia, cognomina, and numerals.
 */
export function toAblativeConsulName(name: string): string {
	return name.split(' ').map(token => {
		// Keep praenomen abbreviations (M., C., L., P., Sp., etc.) and Roman numerals (II, V, etc.)
		if (/^[A-Z]['a-z]?\.$/.test(token) || /^[IVXLCDM]+$/.test(token))
			return token;
		if (ABLATIVE_OVERRIDES[token])
			return ABLATIVE_OVERRIDES[token];

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
 * Searches the active Fasti catalog for a consul name substring and returns matching years.
 */
export function findConsulYears(nameQuery: string): ConsularPair[] {
	let query = nameQuery.trim().toLowerCase();
	if (!query) return [];

	// Normalise common ablative suffixes to match nominative catalog entries
	// Cicerone -> Cicero, Antonio -> Antonius/Antonio, Caesare -> Caesar
	const words = query.split(/\s+/).filter(w => !['et', 'ac', 'atque', 'coss', 'cos'].includes(w));
	if (words.length === 0) return [];

	const results: ConsularPair[] = [];
	const catalog = getRegistry();

	for (const [yearStr, names] of Object.entries(catalog)) {
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
