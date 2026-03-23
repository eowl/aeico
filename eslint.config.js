import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  { ignores: ['dist/', 'node_modules/', '*.config.*'] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended (type-aware) for src/
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.ts'],
  })),

  // TypeScript recommended (syntax-only) for test/
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['test/**/*.ts'],
  })),

  // Shared language options for all TS files
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Allow _-prefixed unused params (common for lifecycle callbacks)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Type-aware parser options for src/ only
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Reactive property system relies on dynamic (this as any) access
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // Base executeUpdate() is async for subclass override; base impl has no await
      '@typescript-eslint/require-await': 'off',
      // Fire-and-forget: queueMicrotask(() => this.executeUpdate())
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      // Intentional interface + class declaration merging in event system
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
    },
  },

  // Test language options (no type-checking, separate tsconfig)
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },

  // Relax rules for test files
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  // Disable formatting rules that conflict with Prettier
  prettier,
);
