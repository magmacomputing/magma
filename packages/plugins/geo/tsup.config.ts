import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.js';

export default defineConfig({
	...sharedConfig,
	entry: ['src/index.ts', 'src/install.ts'],
	noExternal: [
		...(Array.isArray(sharedConfig.noExternal) ? sharedConfig.noExternal : []),
		/^@magmacomputing\/library/,
		/^#library/,
		/^#server/,
		/^#browser/,
	],
});
