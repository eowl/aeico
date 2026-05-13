import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  // Bundle everything — aeico-element and aeico-view are inlined via node-resolve
  external: [],
  plugins: [
    resolve({ exportConditions: ['import'] }),
    typescript({ tsconfig: './tsconfig.build.json' }),
  ],
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
  ],
};
