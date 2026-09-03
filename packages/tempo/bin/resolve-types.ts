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

// 2. Synchronize all library .d.ts files into dist/lib/
function copyAllLibraryDts(srcDir: string, destDir: string) {
	if (!fs.existsSync(srcDir)) return;
	const entries = fs.readdirSync(srcDir, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, entry.name);
		if (entry.isDirectory()) {
			if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
			copyAllLibraryDts(srcPath, destPath);
		} else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
			fs.mkdirSync(path.dirname(destPath), { recursive: true });
			fs.copyFileSync(srcPath, destPath);
		}
	}
}
copyAllLibraryDts(LIB_SRC_DIR, LIB_DEST_DIR);

// Remove top-level duplicated .d.ts files in dist/lib/ when they exist inside a domain subfolder
function cleanDuplicateTopLevelDts() {
	if (!fs.existsSync(LIB_DEST_DIR)) return;
	const entries = fs.readdirSync(LIB_DEST_DIR, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			const subDirPath = path.join(LIB_DEST_DIR, entry.name);
			const subFiles = fs.readdirSync(subDirPath);
			for (const file of subFiles) {
				if (file.endsWith('.d.ts')) {
					const topLevelFile = path.join(LIB_DEST_DIR, file);
					if (fs.existsSync(topLevelFile)) {
						fs.unlinkSync(topLevelFile);
					}
				}
			}
		}
	}
}
cleanDuplicateTopLevelDts();

// 3. Helper to locate actual relative path of a #library file in LIB_SRC_DIR
const libFileCache = new Map<string, string>();
function findInLibSrc(targetFileName: string): string {
	if (libFileCache.has(targetFileName)) return libFileCache.get(targetFileName)!;

	const targetDts = targetFileName.replace(/\.js$/, '.d.ts');

	// Search subdirectories FIRST in LIB_SRC_DIR (e.g. primitives/, runtime/, etc.)
	function search(dir: string, baseDir: string): string | null {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				const found = search(full, baseDir);
				if (found) return found;
			} else if (entry.name === targetDts && dir !== baseDir) {
				return path.relative(baseDir, full).replace(/\.d\.ts$/, '.js').replace(/\\/g, '/');
			}
		}
		return null;
	}

	const subPath = search(LIB_SRC_DIR, LIB_SRC_DIR);
	if (subPath) {
		libFileCache.set(targetFileName, subPath);
		return subPath;
	}

	if (fs.existsSync(path.join(LIB_SRC_DIR, targetDts))) {
		libFileCache.set(targetFileName, targetFileName);
		return targetFileName;
	}

	libFileCache.set(targetFileName, targetFileName);
	return targetFileName;
}

// Helper to locate actual relative path of a #tempo alias in DIST_DIR
function findTempoTarget(importPath: string): string {
	const mappings: Record<string, string> = {
		'#tempo/support': 'support/support.index.js',
		'#tempo/module': 'module/module.index.js',
		'#tempo/parse': 'module/module.parse.js',
		'#tempo/format': 'module/module.format.js',
		'#tempo/mutate': 'module/module.mutate.js',
		'#tempo/duration': 'module/module.duration.js',
		'#tempo/term': 'plugin/term/term.index.js',
		'#tempo/std': 'term/index.js',
	};

	if (mappings[importPath]) return mappings[importPath];
	if (importPath.startsWith('#tempo/')) {
		return importPath.slice(7);
	}
	return importPath;
}

function resolveRelativeImport(fromFile: string, targetDistPath: string): string {
	const fromDir = path.dirname(fromFile);
	const targetAbsPath = path.resolve(DIST_DIR, targetDistPath);
	let rel = path.relative(fromDir, targetAbsPath).replace(/\\/g, '/');
	if (!rel.startsWith('.')) rel = './' + rel;
	return rel;
}

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

	const updatedContent = content
		.replace(/#library\/([^"')]+\.js)/g, (_, libPath) => {
			const actualPath = isInsideLib ? libPath : findInLibSrc(libPath);
			return `${replacement}${actualPath}`;
		})
		.replace(/#library(['"])/g, (_, quote) => `${replacement}index.js${quote}`)
		.replace(/(['"])#tempo\/([^"')]+)\1/g, (match, quote, subPath) => {
			const fullAlias = `#tempo/${subPath}`;
			const targetDistPath = findTempoTarget(fullAlias);
			const rel = resolveRelativeImport(filePath, targetDistPath);
			return `${quote}${rel}${quote}`;
		})
		.replace(/(['"])#tempo\1/g, (_, quote) => {
			const rel = resolveRelativeImport(filePath, 'tempo.index.js');
			return `${quote}${rel}${quote}`;
		});

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
