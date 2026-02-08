import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test-utils.ts',
      ],
    },
  },
  esbuild: {
    // Don't require tsconfig for transformation
    tsconfigRaw: '{}',
  },
})
