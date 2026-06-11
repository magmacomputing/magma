import { mergeConfig, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import baseConfig from './vitest.config.js';

export default mergeConfig(baseConfig, defineConfig({
	test: {
		include: ['test/browser/**/*.{test,spec}.ts'],
		exclude: [],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [
				{ browser: 'chromium' }
			],
			providerOptions: {
				launch: {
					channel: 'chrome',
					args: ['--no-sandbox', '--disable-dev-shm-usage']
				}
			}
		}
	}
}));
