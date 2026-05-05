import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  banner: { js: '#!/usr/bin/env node' },
})
