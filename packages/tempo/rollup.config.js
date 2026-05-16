import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import MagicString from 'magic-string';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');
// we use "_core" to not confuse npm: name can only contain URL-friendly characters.
const licensePremium = process.env.TEMPO_LICENSE_PATH;
const licenseDefault = path.resolve(__dirname, './src/support/support.license.ts');
const isPremiumAvailable = !!(licensePremium && fs.existsSync(licensePremium));
const licensePath = isPremiumAvailable ? licensePremium : licenseDefault;

console.log(`\n📦 Building Tempo [${isPremiumAvailable ? '💎 PREMIUM' : '🍃 COMMUNITY'}]`);
if (isPremiumAvailable) console.log(`🛡️  Engine: ${licensePath}\n`);

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

// Generate a map of entry points from all files in dist (after tsc has run)
const entryPoints = Object.fromEntries(
	getFiles(distPath).map(file => [
		path.relative(distPath, file).replace(/\.js$/, ''),
		file
	])
);

// Force inclusion of the full library for testing/distribution parity
// We resolve this relative to this config file's directory

export default [
	{
		input: path.join(distPath, 'tempo.entry.js'),
		output: [
			{
				file: 'dist/tempo.bundle.js',
				format: 'iife',
				name: '_TempoExport',
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
					{ find: '#tempo/license', replacement: licensePath }
				]
			}),
			resolve({ extensions: ['.js', '.ts'] }),
			esbuild({
				target: 'esnext',
				minify: false,
			})
		],
	},
	{
		input: entryPoints,
		// Keep dependencies external for granular distribution
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

				// 🛡️ Redirect licensing core (Premium or No-Op) and cryptographic dependencies (jose) to lic/
				if (id.includes('tempo-plugin-@core') || id.includes('support.license.ts') || id.includes('node_modules/jose'))
					return `lic/index.js`;

				// 🛡️ Redirect TypeScript helpers (tslib) to ts/
				if (id.includes('node_modules/tslib'))
					return `ts/${name}.js`;

				// Map library imports to lib/ for browser-ready granular ESM
				const rel = path.relative(__dirname, id);
				const normalizedRel = rel.replace(/\\/g, '/'); // Ensure forward slashes
				
				if (id.includes('magma/packages/library') || rel.startsWith('../library')) {
					// Extract path context after /library/src/ or similar
					const match = normalizedRel.match(/library\/(?:src|dist\/common)\/(.*)$/);
					const modulePath = match ? path.dirname(match[1]) : '.';
					const dir = modulePath === '.' ? '' : modulePath + '/';
					return `lib/${dir}${name}.js`;
				}

				if (rel.startsWith('..') || rel.includes('node_modules')) {
					const modulePath = path.dirname(normalizedRel.replace(/^\.\.\//, ''));
					const dir = modulePath === '.' ? '' : modulePath + '/';
					return `lib/${dir}${name}.js`;
				}

				return '[name].js';
			},
			plugins: [
				{
					name: 'obfuscator',
					renderChunk(code, chunk) {
						if (chunk.fileName === 'lic/index.js') {
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
				}
			]
		},
		plugins: [
			alias({
				entries: [
					{ find: '#tempo/license', replacement: licensePath }
				]
			}),
			// We DO want to resolve @magmacomputing/library and bundle it into lib/ 
			// because it's a workspace sibling and part of our distribution logic.
			// But we EXCLUDE tslib (above) as it's a standard external dependency.
			resolve({
				extensions: ['.js', '.ts'],
				moduleDirectories: ['node_modules']
			}),
			esbuild({
				target: 'esnext',
				minify: false,
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
