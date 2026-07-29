import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

/** Builds a single output entry (ES + CJS) for the given file name under a target directory. */
const outputs = (name, dir) => [
  { file: `${dir}/${name}.js`, format: 'es', exports: 'named', sourcemap: true },
  { file: `${dir}/${name}.cjs`, format: 'cjs', exports: 'named', sourcemap: true },
];

const entries = ['index', 'constants'];

/** @type {import('rollup').RollupOptions[]} */
export default [
  // Dev build
  ...entries.map((name) => ({
    input: `src/${name}.ts`,
    external: ['aeico-view'],
    plugins: [
      typescript({
        tsconfig: './tsconfig.build.json',
        compilerOptions: { outDir: './development' },
      }),
    ],
    output: outputs(name, 'development'),
  })),

  // Prod build
  ...entries.map((name) => ({
    input: `src/${name}.ts`,
    external: ['aeico-view'],
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'const AEICO_DEV = true': 'const AEICO_DEV = false',
        },
      }),
      typescript({
        tsconfig: './tsconfig.build.json',
        compilerOptions: { outDir: './dist' },
      }),
    ],
    output: outputs(name, 'dist'),
  })),
];
