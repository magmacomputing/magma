import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.js';

export default defineConfig({
	...sharedConfig,
	format: ['esm'], // Node.js specific plugin
	entry: ['src/index.ts', 'src/worker.ts'],
});
