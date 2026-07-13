import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');
const docFunctionsDir = path.resolve(__dirname, '../doc/functions');

const categories = fs.readdirSync(srcDir, { withFileTypes: true })
	.filter(dirent => dirent.isDirectory())
	.map(dirent => dirent.name);

let syncedCount = 0;

for (const category of categories) {
	const readmePath = path.join(srcDir, category, 'README.md');
	if (fs.existsSync(readmePath)) {
		const destDir = path.join(docFunctionsDir, category);
		fs.mkdirSync(destDir, { recursive: true });

		// Copy the README.md to index.md in the doc directory
		fs.copyFileSync(readmePath, path.join(destDir, 'index.md'));

		console.log(`[sync-docs] Synced: src/${category}/README.md -> doc/functions/${category}/index.md`);
		syncedCount++;
	}
}

if (syncedCount === 0) {
	console.log('[sync-docs] No README.md files found in src sub-directories to sync.');
} else {
	console.log(`[sync-docs] Successfully synced ${syncedCount} documentation files.`);
}
