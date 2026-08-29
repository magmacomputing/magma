import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const docDir = join(__dirname, '../doc');
const outputFile = join(__dirname, '../public/llms-full.txt');
const llmsTxtFile = join(__dirname, '../public/llms.txt');
const pkgFile = join(__dirname, '../package.json');

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

async function updateLlmsTxt(version) {
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

		await updateLlmsTxt(version);

		const files = await getMarkdownFiles(docDir);
		let content = `# Tempo Full Documentation Context (v${version})\n\n> This file contains the complete concatenated markdown documentation set for @magmacomputing/tempo (v${version}). It is intended for automated LLM context ingestion and RAG indexing.\n\n---\n\n`;

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
