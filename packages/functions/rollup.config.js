import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'dist/index.js',
	output: {
		file: 'dist/tempo-fns.global.js',
		format: 'iife',
		name: 'Functions',
		globals: {
			'tempo-kit': 'Tempo'
		}
	},
	external: ['tempo-kit'],
	plugins: [resolve()]
}
