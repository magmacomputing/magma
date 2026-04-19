import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import resolve from '@rollup/plugin-node-resolve';
import MagicString from 'magic-string';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

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
				name: 'Tempo',
				exports: 'default',
				sourcemap: false,
				indent: '\t',
				globals: {
					'@js-temporal/polyfill': 'Temporal'
				}
			},
			{
				file: 'dist/tempo.bundle.esm.js',
				format: 'es',
				sourcemap: false,
				indent: '\t',
			}
		],
		external: ['@js-temporal/polyfill'],
		plugins: [
			resolve({ extensions: ['.js'] }),
			indentFix()
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
			// Map library imports to lib/ for browser-ready granular ESM
			entryFileNames: (chunkInfo) => {
				if (!chunkInfo.facadeModuleId) return '[name].js';
				const rel = path.relative(__dirname, chunkInfo.facadeModuleId);
				return (rel.startsWith('..') || rel.includes('node_modules'))
					? 'lib/' + path.basename(chunkInfo.facadeModuleId, '.js') + '.js'
					: '[name].js';
			}
		},
		plugins: [
			// We DO want to resolve @magmacomputing/library and bundle it into lib/ 
			// because it's a workspace sibling and part of our distribution logic.
			// But we EXCLUDE tslib (above) as it's a standard external dependency.
			resolve({ 
				extensions: ['.js'],
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
