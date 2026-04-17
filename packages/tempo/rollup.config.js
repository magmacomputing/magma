import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';
import MagicString from 'magic-string';

/**
 * Rollup Configuration for Tempo
 * 
 * 1. Global IIFE Bundle: Single file for <script> tags, includes all dependencies.
 * 2. Granular ESM: Multi-file for bundlers, keeps external dependencies external.
 */

export default [
	{
		input: 'dist/tempo.entry.js',
		output: {
			file: 'dist/tempo.bundle.js',
			format: 'iife',
			name: 'Tempo',
			exports: 'default', // Ensures 'new Tempo()' works on the global object
			sourcemap: false,
			indent: '\t',
		},
		plugins: [
			resolve({ extensions: ['.js'] }),
			indentFix()
		],
	},
	{
		input: {
			'tempo.index': 'dist/tempo.index.js',
			'library.index': 'dist/library.index.js'
		},
		// Keep tslib external in ESM distribution for better bundler compatibility
		external: ['tslib'],
		output: {
			dir: 'dist',
			format: 'es',
			preserveModules: true,
			preserveModulesRoot: 'dist',
			sourcemap: false,
			indent: '\t',
			// Map library imports to lib/ for browser-ready granular ESM
			entryFileNames: (chunkInfo) => {
				if (!chunkInfo.facadeModuleId) return '[name].js';
				const rel = path.relative(process.cwd(), chunkInfo.facadeModuleId);
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
