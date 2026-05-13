import typescript from '@rollup/plugin-typescript';

const external = ['aeico-view', 'aeico-element'];

const outputs = (name) => [
  {
    file: `dist/${name}.js`,
    format: 'es',
    exports: 'named',
    sourcemap: true,
  },
  {
    file: `dist/${name}.cjs`,
    format: 'cjs',
    exports: 'named',
    sourcemap: true,
  },
];

export default [
  {
    input: 'src/index.ts',
    external,
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
    output: outputs('index'),
  },
  {
    input: 'src/shim.ts',
    external,
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
    output: outputs('shim'),
  },
];
