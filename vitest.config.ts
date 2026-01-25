import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  esbuild: {
    // Don't require tsconfig for transformation
    tsconfigRaw: '{}',
  },
})
