import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

const plugins = [
  replace({
    preventAssignment: true,
    values: { __DEV__: "(process.env.NODE_ENV !== 'production')" },
  }),
  typescript({ tsconfig: './tsconfig.build.json' }),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.ts',
    external: ['aeico-view'],
    plugins,
    output: [
      { file: 'dist/index.js', format: 'es', exports: 'named', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named', sourcemap: true },
    ],
  },
  {
    input: 'src/constants.ts',
    external: ['aeico-view'],
    plugins,
    output: [
      { file: 'dist/constants.js', format: 'es', exports: 'named', sourcemap: true },
      { file: 'dist/constants.cjs', format: 'cjs', exports: 'named', sourcemap: true },
    ],
  },
];
