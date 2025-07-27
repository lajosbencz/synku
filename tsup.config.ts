import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ['src/cli/main.ts'],
    format: ['esm', 'cjs'],
    shims: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    outDir: 'dist/cli',
    clean: false,
  },
])
