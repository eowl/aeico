import typescript from '@rollup/plugin-typescript';

const plugins = [
  typescript({ tsconfig: './tsconfig.build.json' }),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.ts',
    plugins,
    output: [
      { file: 'dist/index.js', format: 'es', exports: 'named', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named', sourcemap: true },
    ],
  },
];
