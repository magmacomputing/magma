import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.js';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
});
