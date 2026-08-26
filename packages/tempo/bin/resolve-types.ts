import fs from 'node:fs';
import path from 'node:path';

/**
 * resolve-types.ts
 * 
 * Post-build utility to handle Type Definitions (#library -> dist/lib/)
 * - Synchronizes used library types into dist/lib/
 * - Rewrites path aliases in all .d.ts files
 */

const DIST_DIR = path.resolve('dist');
const LIB_SRC_DIR = path.resolve('../library/dist/common');
const LIB_DEST_DIR = path.resolve(DIST_DIR, 'lib');

console.log('Resolving type definitions...');

// 1. Ensure lib directory exists
if (!fs.existsSync(LIB_DEST_DIR))
	fs.mkdirSync(LIB_DEST_DIR, { recursive: true });

// 2. Identify used library modules from Rollup's JS output (recursive)
function copyLibraryDts(dir: string) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			copyLibraryDts(fullPath);
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			const relPath = path.relative(LIB_DEST_DIR, fullPath);
			const dtsRelPath = relPath.replace(/\.js$/, '.d.ts');
			const src = path.join(LIB_SRC_DIR, dtsRelPath);

			if (fs.existsSync(src)) {
				// Copy nested .d.ts
				const destNested = path.join(LIB_DEST_DIR, dtsRelPath);
				fs.mkdirSync(path.dirname(destNested), { recursive: true });
				fs.copyFileSync(src, destNested);
			}
		}
	}
}
copyLibraryDts(LIB_DEST_DIR);

// 4. Walk through all .d.ts files in dist/ to rewrite aliases
function walk(dir: string) {
	const files = fs.readdirSync(dir);
	for (const file of files) {
		const fullPath = path.join(dir, file);
		if (fs.statSync(fullPath).isDirectory()) {
			walk(fullPath);
		} else if (file.endsWith('.d.ts')) {
			rewrite(fullPath);
		}
	}
}

function rewrite(filePath: string) {
	const content = fs.readFileSync(filePath, 'utf8');
	const relToDist = path.relative(DIST_DIR, filePath);
	const depth = relToDist.split(path.sep).length - 1;
	const isInsideLib = relToDist.startsWith(`lib${path.sep}`);

	let replacement: string;
	if (isInsideLib) {
		// If inside lib/, #library/ becomes ./
		replacement = './';
	} else {
		// If at root (or elsewhere), #library/ becomes ./lib/ (with relative prefix)
		let prefix = '';
		for (let i = 0; i < depth; i++) prefix += '../';
		replacement = `${prefix || './'}lib/`;
	}

	// Handle #tempo/license resolution
	let prefix = '';
	for (let i = 0; i < depth; i++) prefix += '../';
	let licReplacement = `${prefix || './'}plugin/license/license.validator.js`;

	const updatedContent = content
		.replace(/#library\/([^"')]+\.js)/g, (_, libPath) => {
			return `${replacement}${libPath}`;
		})
		.replace(/#library(['"])/g, (_, quote) => `${replacement}index.js${quote}`)
		.replace(/#tempo\/license(['"])/g, (_, quote) => `${licReplacement}${quote}`);

	if (content !== updatedContent) {
		fs.writeFileSync(filePath, updatedContent);
	}
}

// 5. Copy .std types to dist/term/
const STD_SRC_DIR = path.resolve('../plugins/.std/dist');
const STD_DEST_DIR = path.resolve(DIST_DIR, 'term');

if (fs.existsSync(STD_SRC_DIR)) {
	if (!fs.existsSync(STD_DEST_DIR)) fs.mkdirSync(STD_DEST_DIR, { recursive: true });
	const stdFiles = fs.readdirSync(STD_SRC_DIR).filter(f => f.endsWith('.d.ts'));
	stdFiles.forEach(f => {
		fs.copyFileSync(path.join(STD_SRC_DIR, f), path.join(STD_DEST_DIR, f));
	});
}

walk(DIST_DIR);
console.log('Type resolution complete.');
