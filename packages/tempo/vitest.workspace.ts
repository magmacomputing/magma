import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: 'vitest.config.ts',
    test: {
      name: 'Tempo: Full',
      include: ['test/**/*.{test,spec}.ts'],
      exclude: [
        '**/node_modules/**',
        '**/test/**/*.core.test.ts',
        '**/test/**/*.lazy.test.ts'
      ],
    }
  },
  {
    extends: 'vitest.config.ts',
    test: {
      name: 'Tempo: Core',
      include: ['test/**/*.core.test.ts', 'test/**/*.lazy.test.ts'],
    }
  }
])
