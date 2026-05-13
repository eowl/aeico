import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  external: ['aeico-element'],
  plugins: [
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
