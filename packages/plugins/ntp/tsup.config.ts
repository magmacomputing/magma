import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.ts';

export default defineConfig({
	...sharedConfig,
	entry: ['src/index.ts', 'src/install.ts'],
});
