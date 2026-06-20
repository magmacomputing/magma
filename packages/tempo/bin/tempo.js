#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CLI Arguments
const args = process.argv.slice(2);
const command = args[0];

// The location of the templates relative to this bin script (bin/tempo.js -> template/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.join(__dirname, '..', 'template');
const cwd = process.cwd();

// Helper to copy a file safely
function safelyCopy(sourceFile, targetFile, successMessage) {
	const sourcePath = path.join(templateDir, sourceFile);
	const targetPath = path.join(cwd, targetFile);

	if (fs.existsSync(targetPath)) {
		console.error(`\x1b[31m[Tempo Scaffold] Aborted.\x1b[0m File already exists at: ${targetPath}`);
		console.error(`We refused to overwrite your existing file. If you want to scaffold a new one, please delete the existing file first.`);
		process.exit(1);
	}

	if (!fs.existsSync(sourcePath)) {
		console.error(`\x1b[31m[Tempo Scaffold] Error.\x1b[0m Could not find template file at: ${sourcePath}`);
		process.exit(1);
	}

	try {
		fs.copyFileSync(sourcePath, targetPath);
		console.log(`\x1b[32m[Tempo Scaffold] Success!\x1b[0m ${successMessage}`);
	} catch (err) {
		console.error(`\x1b[31m[Tempo Scaffold] Failed to copy file:\x1b[0m ${err.message}`);
		process.exit(1);
	}
}

// Route commands
if (command === 'scaffold:config') {
	safelyCopy('tempo.config.sample.ts', 'tempo.config.ts', 'Created tempo.config.ts');
} else if (command === 'scaffold:html') {
	safelyCopy('index.sample.html', 'index.html', 'Created index.html boilerplate');
} else if (command === 'scaffold:all') {
	safelyCopy('tempo.config.sample.ts', 'tempo.config.ts', 'Created tempo.config.ts');
	safelyCopy('index.sample.html', 'index.html', 'Created index.html boilerplate');
} else {
	console.log(`
\x1b[36m@magmacomputing/tempo\x1b[0m CLI

Available Commands:
  scaffold:config   Copies a sample tempo.config.ts into your current directory.
  scaffold:html     Copies a working HTML sandbox (index.html) into your current directory.
  scaffold:all      Copies both files.

Usage:
  npx @magmacomputing/tempo <command>
`);
}
