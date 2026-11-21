import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineLoader } from 'vitepress';

export type GlossaryCategory =
	| 'temporal-math'
	| 'formatting'
	| 'reactivity'
	| 'architecture'
	| 'plugins'
	| 'standards';

export interface GlossaryEntry {
	/** Canonical display name */
	term: string;
	/** URL anchor slug (auto-generated if omitted) */
	slug: string;
	/** Conceptual categorization */
	category: GlossaryCategory;
	/** Concise 1-sentence definition for tooltips, search results, and llms.txt */
	summary: string;
	/** Optional extended technical explanation and rationale */
	details?: string;
	/** Associated formal standards or specifications */
	standards?: Array<{
		name: string;
		url?: string;
	}>;
	/** Related documentation guides or cross-referenced terms */
	seeAlso?: Array<{
		label: string;
		link: string;
	}>;
	/** Common aliases or legacy terms redirected to this entry */
	aliases?: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const glossaryPath = join(__dirname, 'glossary.json');

function toSlug(term: string): string {
	return term
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

declare const data: GlossaryEntry[];
export { data };

export default defineLoader({
	watch: ['./glossary.json'],
	load(): GlossaryEntry[] {
		const raw = JSON.parse(readFileSync(glossaryPath, 'utf-8')) as Array<Omit<GlossaryEntry, 'slug'> & { slug?: string }>;
		return raw
			.map((entry) => ({
				...entry,
				slug: entry.slug ?? toSlug(entry.term),
			}))
			.sort((a, b) => a.term.localeCompare(b.term));
	},
});
