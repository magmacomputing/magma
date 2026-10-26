#!/usr/bin/env node
/**
 * Generates `src/consuls.data.ts` — the Roman Fasti consulares (509 BCE – 541 CE).
 *
 * Source:   English Wikipedia, "List of Roman consuls" (https://en.wikipedia.org/wiki/List_of_Roman_consuls),
 *           which itself follows T.R.S. Broughton, *Magistrates of the Roman Republic* (509–31 BCE)
 *           and the standard imperial Fasti (Degrassi, Bagnall et al., Cooley, Eck).
 * Licence:  Wikipedia text is CC BY-SA 4.0. Only the *facts* (year → names of the eponymous consuls)
 *           are extracted; see NOTICE in the generated file and the plugin README.
 *
 * Scope:    Only the eponymous (ordinary) consuls of each year are kept — the pair that gave the year its
 *           name in formulae such as "M. Tullio Cicerone, C. Antonio Hybrida coss.". Suffect consuls,
 *           consular tribunes, dictators and years without consuls are omitted.
 *
 * Usage:    node scripts/generate-consuls.mjs            (fetches live)
 *           node scripts/generate-consuls.mjs file.wiki  (reads a saved wikitext copy)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=ids|content&rvslots=main'
	+ '&titles=List_of_Roman_consuls&format=json&formatversion=2';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'consuls.data.ts');

async function load() {
	if (process.argv[2]) return { text: readFileSync(process.argv[2], 'utf8'), revid: 'local-file' };
	const res = await fetch(API, { headers: { 'User-Agent': 'tempo-plugin-roman-generator/1.0 (github.com/magmacomputing/magma)' } });
	if (!res.ok) throw new Error(`Wikipedia API responded ${res.status}`);
	const page = (await res.json()).query.pages[0].revisions[0];
	return { text: page.slots.main.content, revid: String(page.revid) };
}

/** Strips wiki markup from a chunk of wikitext, leaving plain text. */
function clean(s) {
	let t = s
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<ref[^>]*\/>/g, '')
		.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
	let prev;
	do { prev = t; t = t.replace(/\{\{[^{}]*\}\}/g, ''); } while (t !== prev);
	return t
		.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
		.replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/'{2,}/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Cleans a single table cell, dropping any "style=…|" attribute prefix. */
function cell(raw) {
	let t = clean(raw);
	if (t.includes('|')) t = t.slice(t.lastIndexOf('|') + 1).trim();
	return t;
}

/** A trailing parenthetical that describes tenure or circumstance rather than the name itself. */
const NOTE = /\s*\((?=[^)]*(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|\bonly\b|\bafter\b|\bbefore\b|\buntil\b|\bfrom\b|\bunder\b|\bdied\b|\bkilled\b|\binvalidated\b|\bresigned\b|\babdicated\b|\bdeposed\b|\breplaced\b|\bsole\b|\b(?:east|west)(?:ern)?\b|\bGaul\b|\battested\b|\?|\d))[^)]*\)\s*$/i;

/** Normalises a consul name; returns '' for unknown / unidentified / non-consul entries. */
function name(raw) {
	let t = cell(raw)
		.replace(/^\(\?\)\s*/, '')
		.replace(/^\([a-z]\)\s+/, '');						// footnote markers: "(a) Bonosus"
	for (let prev = ''; prev !== t;) { prev = t; t = t.replace(NOTE, '').trim(); }

	t = t.replace(/\((?!or\b)([A-Za-z][^()\d/]*)\)/g, '$1');	// unwrap cognomina: "(Africanus)" -> "Africanus"
	t = t.replace(/^(?:East|West):\s*/i, '');
	t = t.replace(/\s+/g, ' ').trim();

	// Deduplicate repeated name phrases: "Strategius Apion Strategius Apion" -> "Strategius Apion"
	t = t.replace(/^(.+?)\s+\1$/, '$1');

	// Clean literal ellipses: "L. Valerius Maximus . . . Acilius Priscillianus"
	t = t.replace(/\s*\.\s*\.\s*\.\s*/g, ' ');

	// Normalize fragmented Fasti Capitolini inscription for 458 BC (-457)
	if (/Carve/i.test(t)) {
		t = 'L. Minucius Esquilinus Augurinus';
	}

	// Normalize late-antique concatenated names for 538 and 540
	if (/^Marianus Michaelius Gabrielius Archangelus Ioannes$/i.test(t)) {
		t = 'Ioannes';
	}
	if (/^Mar\. Petrus Theodorus Valentinus Rusticius Boraides Germanus Justinus$/i.test(t)) {
		t = 'Justinus';
	}

	t = t.replace(/\s+/g, ' ').trim();

	if (!t || /unidentified|unknown|^\?+$/i.test(t) || t.includes('?')) return '';
	if (/tribune|decemvir|dictator|anarchy|interreg|no consuls|vacant|^none$|sine collega|without colleague|post consulatum/i.test(t)) return '';
	return t;
}

const { text, revid } = await load();

const start = text.indexOf('==Sixth century BC');
const end = text.indexOf('==Roman consuls of the East alone');
if (start < 0 || end < 0) throw new Error('Unexpected page structure: century sections not found');

const sections = text.slice(start, end).split(/^==([^=].*?)==\s*$/m);		// [pre, title, body, title, body…]
const fasti = new Map();	// astronomical year → [names]
const skipped = [];

for (let s = 1; s < sections.length; s += 2) {
	const title = sections[s];
	const body = sections[s + 1];
	const bce = /BC/.test(title);

	const rows = body.split(/^\|-.*$/m);
	for (const row of rows) {
		const cells = row.split('\n').filter(l => /^\|(?![-}])/.test(l)).map(l => l.slice(1));
		if (cells.length < 2) continue;

		const label = cell(cells[0]);
		if (!/^\d{1,3}$/.test(label)) continue;				// suffects ("suff."), months ("May?") and separators

		const n = Number(label);
		const year = bce ? 1 - n : n;
		const names = cells.slice(1, 3).map(name).filter(Boolean);

		if (!names.length) { skipped.push(`${bce ? n + ' BCE' : n + ' CE'} (no identified consuls)`); continue; }
		if (!fasti.has(year)) fasti.set(year, names);
	}
}

const years = [...fasti.keys()].sort((a, b) => a - b);
const missing = [];
for (let y = -508; y <= 541; y++) if (y !== 0 && !fasti.has(y)) missing.push(y);

const body = years.map(y => `\t'${y}': ${JSON.stringify(fasti.get(y))},`).join('\n');

writeFileSync(OUT, `/**
 * Roman Fasti consulares: the eponymous (ordinary) consuls for each year, 509 BCE – 541 CE.
 *
 * GENERATED FILE — do not edit by hand. Regenerate with \`node scripts/generate-consuls.mjs\`.
 *
 * NOTICE: Compiled from English Wikipedia, "List of Roman consuls" (revision ${revid}),
 * which follows T.R.S. Broughton, *Magistrates of the Roman Republic* (509–31 BCE) and the standard
 * imperial Fasti. The text of that page is available under CC BY-SA 4.0
 * (https://creativecommons.org/licenses/by-sa/4.0/); this file contains only the historical facts it records
 * (year → consul names). Names are given in the nominative, with praenomina abbreviated as in the source.
 *
 * Years are astronomical (0 = 1 BCE, -43 = 44 BCE). Years with no consuls (e.g. the consular-tribune
 * years and the anarchy of 375–371 BCE) and years whose consuls are unidentified are omitted.
 */

/** Source revision this data was generated from. */
export const CONSULS_SOURCE_REVISION = '${revid}';

/** Astronomical year → names of the eponymous consul(s), in the order they are cited. */
export const CONSULS: Readonly<Record<number, readonly string[]>> = Object.freeze({
${body}
});
`);

console.log(`Wrote ${years.length} years to ${OUT} (source revision ${revid})`);
console.log(`Years in 509 BCE–541 CE with no entry: ${missing.length}`);
console.log(`Skipped (unidentified): ${skipped.length}`);
