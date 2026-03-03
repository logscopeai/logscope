import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types.ts',
        'src/transport/transport-types.ts',
      ],
      thresholds: {
        lines: 91,
        functions: 91,
        statements: 91,
        branches: 91,
      },
    },
  },
});
