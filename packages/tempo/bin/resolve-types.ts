import fs from 'node:fs';
import path from 'node:path';

/**
 * resolve-types.ts
 * 
 * Post-build utility to handle Type Definitions (#library -> lib/)
 * - Synchronizes used library types into dist/lib/
 * - Rewrites path aliases in all .d.ts files
 */

const DIST_DIR = path.resolve('dist');
const LIB_SRC_DIR = path.resolve('../library/dist/common');
const LIB_DEST_DIR = path.resolve(DIST_DIR, 'lib');

const LIC_SRC_DIR = path.resolve('../../../tempo-plugin/packages/@core/dist');
const LIC_DEST_DIR = path.resolve(DIST_DIR, 'lic');

console.log('Resolving type definitions...');

// 1. Ensure lib directory exists
if (!fs.existsSync(LIB_DEST_DIR)) {
  fs.mkdirSync(LIB_DEST_DIR, { recursive: true });
}

// 2. Identify used library modules from Rollup's JS output
const usedModules = fs.readdirSync(LIB_DEST_DIR)
  .filter(f => f.endsWith('.js'))
  .map(f => f.slice(0, -3));

// 3. Copy corresponding .d.ts files from library
usedModules.forEach(mod => {
  const src = path.join(LIB_SRC_DIR, `${mod}.d.ts`);
  const dest = path.join(LIB_DEST_DIR, `${mod}.d.ts`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

// 4. Copy licensing core types
if (fs.existsSync(LIC_SRC_DIR)) {
  if (!fs.existsSync(LIC_DEST_DIR)) fs.mkdirSync(LIC_DEST_DIR, { recursive: true });
  const licFiles = fs.readdirSync(LIC_SRC_DIR).filter(f => f.endsWith('.d.ts'));
  licFiles.forEach(file => {
    fs.copyFileSync(path.join(LIC_SRC_DIR, file), path.join(LIC_DEST_DIR, file));
  });
} else {
  console.warn(`\n⚠️  WARNING: External license directory not found: ${LIC_SRC_DIR}`);
  console.warn(`⚠️  Creating fallback minimal types in ${LIC_DEST_DIR}\n`);
  if (!fs.existsSync(LIC_DEST_DIR)) fs.mkdirSync(LIC_DEST_DIR, { recursive: true });
  const fallbackSrc = path.join(DIST_DIR, 'support', 'support.license.d.ts');
  if (fs.existsSync(fallbackSrc)) {
    fs.copyFileSync(fallbackSrc, path.join(LIC_DEST_DIR, 'index.d.ts'));
  } else {
    fs.writeFileSync(path.join(LIC_DEST_DIR, 'index.d.ts'), 'export {};\n');
  }
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
  const isInsideLib = relToDist.startsWith('lib');

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
  let licReplacement: string;
  const isInsideLic = relToDist.startsWith('lic');
  if (isInsideLic) {
    licReplacement = './';
  } else {
    let prefix = '';
    for (let i = 0; i < depth; i++) prefix += '../';
    licReplacement = `${prefix || './'}lic/`;
  }

  const updatedContent = content
    .replace(/#library\/([^"')]+\.js)/g, (match, libPath) => {
      // NOTE: We use path.basename here because the @magmacomputing/library distribution 
      // is currently flat (dist/common/*.js), and our resolve process flattens all 
      // used library modules into the local dist/lib/ directory.
      const fileName = path.basename(libPath);
      return `${replacement}${fileName}`;
    })
    .replace(/#library(['"])/g, (match, quote) => `${replacement}index.js${quote}`)
    .replace(/#tempo\/license(['"])/g, (match, quote) => `${licReplacement}index.js${quote}`);

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
  }
}

walk(DIST_DIR);
console.log('Type resolution complete.');
