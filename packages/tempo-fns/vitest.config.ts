import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const polyfill = resolve(__dirname, '../tempo/bin/temporal-polyfill.ts');

export default defineConfig({
	esbuild: false,
	oxc: false,
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
		environment: 'node',
		include: ['test/**/*.test.ts'],
		setupFiles: [polyfill]
	}
});
