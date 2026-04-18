import { defineWorkspace } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url));
const polyfill = resolve(__dirname, 'packages/tempo/bin/setup.polyfill.ts');

export default defineWorkspace([
  {
    extends: 'packages/tempo/vitest.config.ts',
    test: {
      name: 'Tempo: Full',
      include: ['packages/tempo/test/**/*.{test,spec}.ts'],
      exclude: [
        '**/node_modules/**',
        '**/test/**/*.core.test.ts',
        '**/test/**/*.lazy.test.ts'
      ],
      setupFiles: [polyfill],
    }
  },
  {
    extends: 'packages/tempo/vitest.config.ts',
    test: {
      name: 'Tempo: Core',
      include: ['packages/tempo/test/**/*.core.test.ts', 'packages/tempo/test/**/*.lazy.test.ts'],
      exclude: ['**/node_modules/**'],
      setupFiles: [polyfill],
    }
  },
  {
    extends: 'packages/library/vitest.config.ts',
    test: {
      name: 'Library: Full',
      include: ['packages/library/test/**/*.{test,spec}.ts'],
      exclude: ['**/node_modules/**'],
      setupFiles: [polyfill],
    }
  }
])
