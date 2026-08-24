import resolve from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const domains = ['primitives', 'temporal', 'security', 'runtime', 'scheduling'];
const libraryDist = path.resolve(__dirname, '../library/dist/common');

function resolveLibrary(importPath) {
	const rel = importPath.replace(/^#library\//, '');
	for (const domain of domains) {
		const candidate = path.join(libraryDist, domain, rel);
		if (fs.existsSync(candidate)) return candidate;
	}
	return path.join(libraryDist, rel);
}

export default {
	input: 'dist/index.js',
	output: {
		file: 'dist/tempo-fns.global.js',
		format: 'iife',
		name: 'Functions',
		globals: {
			'@magmacomputing/tempo': 'Tempo'
		}
	},
	external: ['@magmacomputing/tempo'],
	plugins: [
		alias({
			entries: [
				{
					find: /^#library\/(.*)$/,
					replacement: '$1',
					customResolver(source) {
						return resolveLibrary(source);
					}
				},
				{ find: '#library', replacement: path.resolve(__dirname, '../library/dist/common.index.js') }
			]
		}),
		resolve()
	]
}

