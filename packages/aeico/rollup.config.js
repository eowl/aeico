import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

/** @type {import('rollup').RollupOptions[]} */
export default [
  // Dev build
  {
    input: 'src/index.ts',
    external: ['aeico-element', 'aeico-element/constants', 'aeico-view'],
    plugins: [typescript({ tsconfig: './tsconfig.build.json', compilerOptions: { outDir: './development' } })],
    output: [
      { file: 'development/index.js', format: 'es', exports: 'named', sourcemap: true },
      { file: 'development/index.cjs', format: 'cjs', exports: 'named', sourcemap: true },
    ],
  },
  // Prod build
  {
    input: 'src/index.ts',
    external: ['aeico-element', 'aeico-element/constants', 'aeico-view'],
    plugins: [
      replace({
        preventAssignment: true,
        values: { 'const AEICO_DEV = true': 'const AEICO_DEV = false' },
      }),
      typescript({ tsconfig: './tsconfig.build.json', compilerOptions: { outDir: './dist' } }),
    ],
    output: [
      { file: 'dist/index.js', format: 'es', exports: 'named', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named', sourcemap: true },
    ],
  },
];
