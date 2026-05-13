import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  external: ['aeico-view'],
  plugins: [
    replace({
      preventAssignment: true,
      values: { __DEV__: 'import.meta.env.DEV' },
    }),
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
