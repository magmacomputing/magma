import resolve from '@rollup/plugin-node-resolve';

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
	plugins: [resolve()]
}
