import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.ts';

export default defineConfig({
	...sharedConfig,
	entry: ['src/index.ts', 'src/zodiac.ts', 'src/eastern.ts', 'src/install.ts'],
});
