import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../');
const polyfill = resolve(__dirname, './test/setup.ts');

export default defineConfig({
	esbuild: false,
	plugins: [
		swc.vite({
			jsc: {
				target: 'es2022',
				parser: { syntax: 'typescript', decorators: true },
				transform: { decoratorVersion: '2023-11' },
			},
		}),
	],
	test: {
		globals: true,
		pool: 'forks',
		maxWorkers: 2,
		environment: 'node',
		include: ['test/**/*.test.ts'],
		setupFiles: [polyfill]
	},
	resolve: {
		alias: [
			{ find: /^@magmacomputing\/tempo-fns$/, replacement: resolve(__dirname, './src/index.ts') },
			{ find: /^@magmacomputing\/tempo-fns\/(.*)$/, replacement: resolve(__dirname, './src/$1.ts') },
			{ find: /^@magmacomputing\/tempo$/, replacement: resolve(rootDir, './packages/tempo/src/tempo.index.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin-api$/, replacement: resolve(rootDir, './packages/tempo/src/plugin-api.index.ts') },
			{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: resolve(rootDir, './packages/tempo/src/plugin/term/term.$1.ts') },
			{ find: /^@magmacomputing\/tempo\/(.*)$/, replacement: resolve(rootDir, './packages/tempo/src/$1.ts') },
			{ find: /^@magmacomputing\/library$/, replacement: resolve(rootDir, './packages/library/src/common.index.ts') },
			{ find: /^@magmacomputing\/library\/(primitives|temporal|security|scheduling|runtime)\/(.*)$/, replacement: resolve(rootDir, './packages/library/src/common/$1/$2') },
			{ find: /^@magmacomputing\/library\/(.*)$/, replacement: resolve(rootDir, './packages/library/src/$1.ts') },
			{ find: /^#library\/(primitives|temporal|security|scheduling|runtime)\/(.*)\.js$/, replacement: resolve(rootDir, './packages/library/src/common/$1/$2.ts') },
			{ find: /^#library\/([^/]+)\/index\.js$/, replacement: resolve(rootDir, './packages/library/src/common/$1/index.ts') },
			{ find: /^#library\/(browser|server)\/(.*)\.js$/, replacement: resolve(rootDir, './packages/library/src/$1/$2.ts') },
			{ find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: resolve(rootDir, './packages/library/src/common/primitives/$1.library.ts') },
			{ find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: resolve(rootDir, './packages/library/src/common/temporal/$1.library.ts') },
			{ find: /^#library\/temporal\.polyfill\.js$/, replacement: resolve(rootDir, './packages/library/src/common/temporal/temporal.polyfill.ts') },
			{ find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: resolve(rootDir, './packages/library/src/common/security/$1.library.ts') },
			{ find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: resolve(rootDir, './packages/library/src/common/scheduling/$1.library.ts') },
			{ find: /^#library\/(.*)\.js$/, replacement: resolve(rootDir, './packages/library/src/common/runtime/$1.ts') },
			{ find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: resolve(rootDir, './packages/tempo/src/plugin/term/$1.ts') },
			{ find: /^#tempo\/plugin\.(util|type)\.js$/, replacement: resolve(rootDir, './packages/tempo/src/plugin/plugin.$1.ts') },
			{ find: /^#tempo\/plugin\.(.*)\.js$/, replacement: resolve(rootDir, './packages/tempo/src/plugin/extend/plugin.$1.ts') },
			{ find: /^#tempo\/term\/quarter$/, replacement: resolve(rootDir, './packages/tempo/src/plugin/term/term.quarter.ts') },
			{ find: /^#tempo\/term$/, replacement: resolve(rootDir, './packages/tempo/src/plugin/term/term.index.ts') },
			{ find: /^#tempo\/std$/, replacement: resolve(rootDir, './packages/plugins/.std/src/index.ts') },
			{ find: /^#tempo\/core$/, replacement: resolve(rootDir, './packages/tempo/src/core.index.ts') },
			{ find: /^#tempo\/config\/(.*)\.js$/, replacement: resolve(rootDir, './packages/tempo/src/config/$1.ts') },
			{ find: /^#tempo\/config$/, replacement: resolve(rootDir, './packages/tempo/src/config/config.index.ts') },
			{ find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: resolve(rootDir, './packages/tempo/src/module/module.$1.ts') },
			{ find: /^#tempo\/support$/, replacement: resolve(rootDir, './packages/tempo/src/support/support.index.ts') },
			{ find: /^#tempo\/module$/, replacement: resolve(rootDir, './packages/tempo/src/module/module.index.ts') },
			{ find: /^#tempo\/tempo\.class\.js$/, replacement: resolve(rootDir, './packages/tempo/src/tempo.index.ts') },
			{ find: /^#tempo\/(.*)\.js$/, replacement: resolve(rootDir, './packages/tempo/src/$1.ts') },
			{ find: /^#tempo\/(.*)$/, replacement: resolve(rootDir, './packages/tempo/src/$1.ts') }
		]
	}
});

