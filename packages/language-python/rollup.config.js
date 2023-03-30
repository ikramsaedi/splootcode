import copy from 'rollup-plugin-copy'
import dts from 'rollup-plugin-dts'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    plugins: [
      typescript(),
      json(),
      copy({
        targets: [{ src: 'tray/**', dest: 'dist/tray' }],
      }),
    ],
    input: 'src/index.ts',
    output: [
      {
        file: `dist/index.mjs`,
        format: 'es',
        sourcemap: true,
      },
      {
        file: `dist/index.js`,
        format: 'cjs',
        sourcemap: true,
      },
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ file: `dist/index.d.ts`, format: 'es' }],
    plugins: [dts(), json()],
  },
]
