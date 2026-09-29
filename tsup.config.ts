import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'node/index': 'src/node/index.ts',
    commands: 'src/commands.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  // Provides `import.meta.url` in the CJS build (used to resolve the lighthouse peer dependency).
  shims: true,
  clean: true,
  target: 'node22',
  sourcemap: true,
});
