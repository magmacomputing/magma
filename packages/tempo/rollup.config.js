import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import MagicString from 'magic-string';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

const pkgPath = path.resolve(__dirname, 'package.json');
const pkgVersion = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version : '4.0.0';
const label = `📦 BUILDING TEMPO (v${pkgVersion})`;
const paddedLabel = label.padStart(Math.floor((43 + label.length) / 2)).padEnd(45);

console.log('\n\x1b[42m\x1b[30m\x1b[1m =========================================== \x1b[0m');
console.log(`\x1b[42m\x1b[30m\x1b[1m${paddedLabel}\x1b[0m`);
console.log('\x1b[42m\x1b[30m\x1b[1m =========================================== \x1b[0m\n');

/**
 * Rollup Configuration for Tempo
 * 
 * 1. Global IIFE Bundle: Single file for <script> tags, includes all dependencies.
 * 2. Minified Global IIFE Bundle: Minified for CDNs.
 * 3. Granular ESM: Multi-file for bundlers, keeps external dependencies external.
 */

function getFiles(dir, suffix = '.js') {
	const files = [];
	if (!fs.existsSync(dir)) return files;

	try {
		const items = fs.readdirSync(dir, { withFileTypes: true });
		for (const item of items) {
			const fullPath = path.join(dir, item.name);
			if (item.isDirectory()) {
				files.push(...getFiles(fullPath, suffix));
			} else if (item.name.endsWith(suffix) && !item.name.endsWith('.bundle.js') && !item.name.endsWith('.entry.js')) {
				files.push(fullPath);
			}
		}
	} catch (e) {
		console.error(`Rollup Build Warning: Could not read directory ${dir}. Ensure 'tsc' has run.`);
	}
	return files;
}

// Generate a map of entry points
const entryPoints = Object.fromEntries(
	getFiles(distPath)
		.map(file => [path.relative(distPath, file).replace(/\.js$/, ''), file])
);

const stdDir = path.resolve(__dirname, '../plugins/.std/dist');
if (fs.existsSync(stdDir)) {
	const stdFiles = getFiles(stdDir, '.js');
	for (const file of stdFiles) {
		const rel = path.relative(stdDir, file).replace(/\.js$/, '');
		entryPoints[`term/${rel}`] = file;
	}
}

const internalAliases = [
	{ find: '#tempo/std', replacement: path.resolve(__dirname, '../plugins/.std/dist/index.js') },
	{ find: /^#library\/(browser|server)\/(.*)\.js$/, replacement: path.resolve(__dirname, '../library/dist/$1/$2.js') },
	{ find: /^#library\/([^/]+)\/index\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/$1/index.js') },
	{ find: /^#library\/([^/]+)\/(.*)\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/$1/$2.js') },
	{ find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/primitives/$1.library.js') },
	{ find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/temporal/$1.library.js') },
	{ find: /^#library\/temporal\.polyfill\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/temporal/temporal.polyfill.js') },
	{ find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/security/$1.library.js') },
	{ find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/scheduling/$1.library.js') },
	{ find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/runtime/$1.js') },
	{ find: /^#library\/(.*)$/, replacement: path.resolve(__dirname, '../library/dist/common/runtime/$1.js') },
	{ find: /^#library$/, replacement: path.resolve(__dirname, '../library/dist/common.index.js') },
	{ find: /^@magmacomputing\/library\/(?:common|src\/common)\/(.*)\.js$/, replacement: path.resolve(__dirname, '../library/dist/common/$1.js') },
	{ find: /^@magmacomputing\/library\/(?:common|src\/common)\/(.*)$/, replacement: path.resolve(__dirname, '../library/dist/common/$1.js') },
	{ find: /^@magmacomputing\/library$/, replacement: path.resolve(__dirname, '../library/dist/common.index.js') },
	{ find: /^@magmacomputing\/tempo\/plugin\/sdk$/, replacement: path.resolve(__dirname, 'dist/plugin/plugin.sdk.js') },
	{ find: /^@magmacomputing\/tempo\/library$/, replacement: path.resolve(__dirname, 'dist/library.index.js') },
	{ find: /^@magmacomputing\/tempo\/core$/, replacement: path.resolve(__dirname, 'dist/core.index.js') },
	{ find: /^@magmacomputing\/tempo\/support$/, replacement: path.resolve(__dirname, 'dist/support/support.index.js') },
	{ find: /^@magmacomputing\/tempo\/config$/, replacement: path.resolve(__dirname, 'dist/config/config.index.js') },
	{ find: /^@magmacomputing\/tempo\/enums$/, replacement: path.resolve(__dirname, 'dist/support/support.enum.js') },
	{ find: /^@magmacomputing\/tempo\/plugin$/, replacement: path.resolve(__dirname, 'dist/plugin/plugin.index.js') },
	{ find: /^@magmacomputing\/tempo\/term$/, replacement: path.resolve(__dirname, 'dist/plugin/term/term.index.js') },
	{ find: /^@magmacomputing\/tempo\/duration$/, replacement: path.resolve(__dirname, 'dist/module/module.duration.js') },
	{ find: /^@magmacomputing\/tempo\/mutate$/, replacement: path.resolve(__dirname, 'dist/module/module.mutate.js') },
	{ find: /^@magmacomputing\/tempo\/format$/, replacement: path.resolve(__dirname, 'dist/module/module.format.js') },
	{ find: /^@magmacomputing\/tempo\/parse$/, replacement: path.resolve(__dirname, 'dist/module/module.parse.js') },
	{ find: /^@magmacomputing\/tempo\/term\/standard$/, replacement: path.resolve(__dirname, '../plugins/.std/dist/index.js') },
	{ find: /^@magmacomputing\/tempo\/term\/quarter$/, replacement: path.resolve(__dirname, '../plugins/.std/dist/term.quarter.js') },
	{ find: /^@magmacomputing\/tempo\/term\/season$/, replacement: path.resolve(__dirname, '../plugins/.std/dist/term.season.js') },
	{ find: /^@magmacomputing\/tempo\/term\/zodiac$/, replacement: path.resolve(__dirname, '../plugins/.std/dist/term.zodiac.js') },
	{ find: /^@magmacomputing\/tempo\/term\/timeline$/, replacement: path.resolve(__dirname, '../plugins/.std/dist/term.timeline.js') },
	{ find: /^@magmacomputing\/tempo\/extend\/(.*)$/, replacement: path.resolve(__dirname, 'dist/plugin/extend/extend.$1.js') },
	{ find: /^@magmacomputing\/tempo\/module\/(.*)$/, replacement: path.resolve(__dirname, 'dist/module/module.$1.js') },
	{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, 'dist/plugin/term/term.$1.js') },
	{ find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: path.resolve(__dirname, 'dist/plugin/$1.js') },
	{ find: /^@magmacomputing\/tempo$/, replacement: path.resolve(__dirname, 'dist/tempo.index.js') },
	{ find: /^@magmacomputing\/tempo\/(.*)$/, replacement: path.resolve(__dirname, 'dist/$1.js') }
];

export default [
	// 1. 🌐 GLOBAL IIFE BUNDLE
	{
		input: path.join(distPath, 'tempo.entry.js'),
		output: [
			{
				file: 'dist/tempo.bundle.js',
				format: 'iife',
				name: 'Magma',
				exports: 'named',
				sourcemap: false,
				indent: '\t',
				inlineDynamicImports: true,
				globals: {
					'@js-temporal/polyfill': 'Temporal'
				}
			},
			{
				file: 'dist/tempo.bundle.esm.js',
				format: 'es',
				sourcemap: false,
				indent: '\t',
				inlineDynamicImports: true,
			}
		],
		external: ['@js-temporal/polyfill'],
		plugins: [
			alias({
				entries: internalAliases
			}),
			resolve({ extensions: ['.js'], exportConditions: ['node', 'import', 'default'] })
		],
	},

	// 2. 🌐 MINIFIED GLOBAL IIFE BUNDLE
	{
		input: path.join(distPath, 'tempo.entry.js'),
		output: [
			{
				file: 'dist/tempo.bundle.min.js',
				format: 'iife',
				name: 'Magma',
				exports: 'named',
				sourcemap: true,
				indent: '\t',
				inlineDynamicImports: true,
				globals: {
					'@js-temporal/polyfill': 'Temporal'
				}
			},
			{
				file: 'dist/tempo.bundle.esm.min.js',
				format: 'es',
				sourcemap: true,
				indent: '\t',
				inlineDynamicImports: true,
			}
		],
		external: ['@js-temporal/polyfill'],
		plugins: [
			alias({
				entries: internalAliases
			}),
			resolve({ extensions: ['.js'], exportConditions: ['node', 'import', 'default'] }),
			terser()
		],
	},

	// 3. 🧩 GRANULAR ESM
	{
		input: entryPoints,
		external: ['@js-temporal/polyfill'],
		output: {
			dir: 'dist',
			format: 'es',
			preserveModules: true,
			preserveModulesRoot: distPath,
			sourcemap: false,
			indent: '\t',
			entryFileNames: (chunkInfo) => {
				const id = chunkInfo.facadeModuleId;
				if (!id) return '[name].js';

				const ext = path.extname(id);
				const name = path.basename(id, ext);

				// 🛡️ Redirect TypeScript helpers (tslib) to ts/
				if (id.includes('node_modules/tslib'))
					return `ts/${name}.js`;

				// Map library imports to lib/ for browser-ready granular ESM
				const rel = path.relative(__dirname, id);
				const normalizedRel = rel.replace(/\\/g, '/');			// Ensure forward slashes

				if (id.includes('magma/packages/library') || rel.startsWith('../library')) {
					const match = normalizedRel.match(/library\/(?:src|dist\/common)\/(.*)$/);
					const modulePath = match ? path.dirname(match[1]) : '.';
					const dir = modulePath === '.' ? '' : modulePath + '/';
					return `lib/${dir}${name}.js`;
				}

				if (id.includes('magma/packages/plugins/.std') || rel.startsWith('../plugins/.std')) {
					const match = normalizedRel.match(/plugins\/\.std\/(?:src|dist)\/(.*)$/);
					const modulePath = match ? path.dirname(match[1]) : '.';
					const dir = modulePath === '.' ? '' : modulePath + '/';
					return `term/${dir}${name}.js`;
				}

				if (rel.startsWith('..') || rel.includes('node_modules')) {
					const sanitized = normalizedRel.replace(/^(\.\.\/)+/, '');
					const modulePath = path.dirname(sanitized);
					const dir = modulePath === '.' ? '' : modulePath + '/';
					return `lib/${dir}${name}.js`;
				}

				return '[name].js';
			}
		},
		plugins: [
			alias({
				entries: internalAliases
			}),
			resolve({
				extensions: ['.js'],
				exportConditions: ['node', 'import', 'default'],
				moduleDirectories: ['node_modules']
			}),
			indentFix()
		],
	}
];

function indentFix() {
	return {
		name: 'indentation-fix',
		renderChunk(code) {
			const ms = new MagicString(code);
			const regex = /^( {4})+/gm;
			let match;

			while ((match = regex.exec(code)) !== null) {
				ms.overwrite(match.index, match.index + match[0].length, '\t'.repeat(match[0].length / 4));
			}

			return {
				code: ms.toString(),
				map: ms.generateMap({ hires: true })
			};
		}
	};
}
