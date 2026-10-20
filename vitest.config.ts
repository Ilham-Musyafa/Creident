import { defineConfig } from 'vitest/config';

// Domain tests run in vitest. src/lib/db.test.ts uses node:test because it needs
// Node's built-in node:sqlite module, so it is excluded here and run by `node --test`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'src/lib/db.test.ts'],
  },
});
