import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.js';

export default defineConfig({
	...sharedConfig,
	dts: {
		resolve: true,
		compilerOptions: {
			paths: {
				'tempo-lib/runtime/*': ['../../library/src/common/runtime/*'],
				'tempo-lib/server/*': ['../../library/src/server/*'],
				'tempo-lib/browser/*': ['../../library/src/browser/*'],
				'#library/primitives/*': ['../../library/src/common/primitives/*'],
				'#library/temporal/*': ['../../library/src/common/temporal/*'],
				'#library/security/*': ['../../library/src/common/security/*'],
				'#library/scheduling/*': ['../../library/src/common/scheduling/*'],
				'#library/runtime/*': ['../../library/src/common/runtime/*'],
				'#library/*': ['../../library/src/common/runtime/*', '../../library/src/common/*'],
			},
		},
	},
	entry: ['src/index.ts', 'src/install.ts'],
	noExternal: [
		...(Array.isArray(sharedConfig.noExternal) ? sharedConfig.noExternal : []),
		/^tempo-lib/,
		/^#library/,
		/^#server/,
		/^#browser/,
	],
});
