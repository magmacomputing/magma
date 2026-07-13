import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import ts from 'typescript';
import terser from '@rollup/plugin-terser';
import JavaScriptObfuscator from 'javascript-obfuscator';
import MagicString from 'magic-string';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

const licensePremium = process.env.TEMPO_LICENSE_PATH ? path.resolve(process.env.TEMPO_LICENSE_PATH) : undefined;
const licenseDefault = path.resolve(__dirname, './src/plugin/license/license.validator.ts');

const foundTsconfigPath = (() => {
	if (!licensePremium) return '';
	let dir = path.dirname(licensePremium);
	while (dir !== path.resolve(dir, '..')) {
		const p = path.resolve(dir, 'tsconfig.json');
		if (fs.existsSync(p)) return p;
		dir = path.resolve(dir, '..');
	}
	return '';
})();

if (licensePremium && !foundTsconfigPath)
	throw new Error(`TEMPO_LICENSE_PATH is set to ${licensePremium} but no ancestor tsconfig.json was found.`);

const isPremiumAvailable = Boolean(
	licensePremium &&
	fs.existsSync(licensePremium) &&
	fs.existsSync(foundTsconfigPath)
);
const licensePath = isPremiumAvailable ? licensePremium : licenseDefault;

if (isPremiumAvailable) {
	console.log('\n\x1b[45m\x1b[37m\x1b[1m =========================================== \x1b[0m');
	console.log('\x1b[45m\x1b[37m\x1b[1m        📦 BUILDING TEMPO: 💎 PREMIUM        \x1b[0m');
	console.log('\x1b[45m\x1b[37m\x1b[1m =========================================== \x1b[0m');
	console.log(`\x1b[35m🛡️  Engine: ${licensePath}\x1b[0m\n`);
} else {
	console.log('\n\x1b[42m\x1b[30m\x1b[1m =========================================== \x1b[0m');
	console.log('\x1b[42m\x1b[30m\x1b[1m       📦 BUILDING TEMPO: 🍃 COMMUNITY       \x1b[0m');
	console.log('\x1b[42m\x1b[30m\x1b[1m =========================================== \x1b[0m\n');
}

/**
 * Rollup Configuration for Tempo
 * 
 * 1. Global IIFE Bundle: Single file for <script> tags, includes all dependencies.
 * 2. Granular ESM: Multi-file for bundlers, keeps external dependencies external.
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

// Generate a map of entry points, EXCLUDING the license module because we build it separately
const entryPoints = Object.fromEntries(
	getFiles(distPath)
		.map(file => [path.relative(distPath, file).replace(/\.js$/, ''), file])
		.filter(([key]) => !isPremiumAvailable || key !== 'plugin/license/license.validator')
);

export default [
	...(isPremiumAvailable ? [{
		input: licensePath,
		output: {
			file: 'dist/plugin/license/license.validator.js', // Overwrites the tsc output stealthily
			format: 'es',
			sourcemap: false
		},
		external: [
			'@js-temporal/polyfill',
			/^@magmacomputing\/tempo/,
			/^@magmacomputing\/library/,
			/^#library/,
			/^#tempo/
		],
		plugins: [
			{
				name: 'manual-typescript',
				transform(code, id) {
					if (!id.endsWith('.ts')) return null;
					return {
						code: ts.transpileModule(code, {
							compilerOptions: { 
								target: ts.ScriptTarget.ESNext, 
								module: ts.ModuleKind.ESNext,
								moduleResolution: ts.ModuleResolutionKind.NodeJs,
								sourceMap: false,
								declaration: false
							}
						}).outputText,
						map: null
					};
				}
			},
			resolve({ extensions: ['.js', '.ts'], moduleDirectories: ['node_modules'] }),
			{
				name: 'obfuscator',
				renderChunk(code) {
					return {
						code: JavaScriptObfuscator.obfuscate(code, {
							compact: true,
							identifierNamesGenerator: 'mangled',
							unicodeEscapeSequence: false
						}).getObfuscatedCode(),
						map: null
					}
				}
			}
		]
	}] : []),

	// 2. 🌐 GLOBAL IIFE BUNDLE
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
				entries: [
					// Pull in the already-obfuscated monolith!
					{ find: '#tempo/license', replacement: path.resolve(__dirname, 'dist/plugin/license/license.validator.js') }
				]
			}),
			resolve({ extensions: ['.js', '.ts'] })
		],
	},

	// 2b. 🌐 MINIFIED GLOBAL IIFE BUNDLE
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
				entries: [
					// Pull in the already-obfuscated monolith!
					{ find: '#tempo/license', replacement: path.resolve(__dirname, 'dist/plugin/license/license.validator.js') }
				]
			}),
			resolve({ extensions: ['.js', '.ts'] }),
			terser()
		],
	},

	// 3. 🧩 GRANULAR ESM
	{
		input: entryPoints,
		// Keep dependencies external. Resolving #tempo/license via alias forces Rollup to rewrite the dynamic import to a native relative path!
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
				entries: [
					{ find: '#tempo/license', replacement: path.resolve(__dirname, 'dist/plugin/license/license.validator.js') }
				]
			}),
			// We DO want to resolve @magmacomputing/library and bundle it into lib/ 
			resolve({
				extensions: ['.js', '.ts'],
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
