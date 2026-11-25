import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const docDir = join(__dirname, '../doc');
const outputFile = join(__dirname, '../public/llms-full.txt');
const llmsTxtFile = join(__dirname, '../public/llms.txt');
const glossaryFile = join(__dirname, '../doc/glossary.json');
const pkgFile = join(__dirname, '../package.json');

async function buildGlossarySection() {
	const raw = JSON.parse(await readFile(glossaryFile, 'utf-8'));
	const sorted = [...raw].sort((a, b) => a.term.localeCompare(b.term));
	const lines = sorted.map((entry) => `- **${entry.term}** (\`${entry.category}\`): ${entry.summary}`);
	return `## Glossary\n\n${lines.join('\n')}`;
}

async function getMarkdownFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	let files = [];
	for (const entry of entries) {
		const res = join(dir, entry.name);
		if (entry.isDirectory()) {
			files = files.concat(await getMarkdownFiles(res));
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			files.push(res);
		}
	}
	return files.sort();
}

async function updateLlmsTxt(version, glossarySection) {
	try {
		let llmsTxt = await readFile(llmsTxtFile, 'utf-8');
		llmsTxt = llmsTxt.replace(
			/^# Tempo: Immutable Date-Time Engine & AI Syntax Rules(?:\s+\(v[^\)]+\))?/m,
			`# Tempo: Immutable Date-Time Engine & AI Syntax Rules (v${version})`
		);
		llmsTxt = llmsTxt.replace(
			/^> Tempo(?:\s+\(v[^\)]+\))?\s+is an immutable/m,
			`> Tempo (v${version}) is an immutable`
		);
		if (glossarySection) {
			const block = `<!-- GLOSSARY:START -->\n${glossarySection}\n<!-- GLOSSARY:END -->`;
			if (/<!-- GLOSSARY:START -->[\s\S]*?<!-- GLOSSARY:END -->/.test(llmsTxt)) {
				llmsTxt = llmsTxt.replace(/<!-- GLOSSARY:START -->[\s\S]*?<!-- GLOSSARY:END -->/, () => block);
			} else {
				llmsTxt = `${llmsTxt.trimEnd()}\n\n${block}\n`;
			}
		}
		await writeFile(llmsTxtFile, llmsTxt, 'utf-8');
		console.log(`✅ Successfully updated llms.txt with version v${version}`);
	} catch (err) {
		console.error('❌ Error updating llms.txt version:', err);
	}
}

async function generateLlmsFull() {
	try {
		const pkg = JSON.parse(await readFile(pkgFile, 'utf-8'));
		const version = pkg.version || '4.0.0';

		const glossarySection = await buildGlossarySection();
		await updateLlmsTxt(version, glossarySection);

		const files = await getMarkdownFiles(docDir);
		let content = `# Tempo Full Documentation Context (v${version})\n\n> This file contains the complete concatenated markdown documentation set for tempo-kit (v${version}). It is intended for automated LLM context ingestion and RAG indexing.\n\n---\n\n`;
		if (glossarySection)
			content += `${glossarySection}\n\n---\n\n`;

		for (const file of files) {
			const relPath = relative(docDir, file);
			const fileContent = await readFile(file, 'utf-8');
			content += `\n\n<!-- START DOCUMENT: ${relPath} -->\n# Document: ${relPath}\n\n${fileContent}\n\n<!-- END DOCUMENT: ${relPath} -->\n\n---\n`;
		}

		await writeFile(outputFile, content, 'utf-8');
		console.log(`✅ Successfully generated llms-full.txt v${version} (${files.length} markdown documents merged)`);
	} catch (err) {
		console.error('❌ Error generating llms-full.txt:', err);
		process.exit(1);
	}
}

generateLlmsFull();
