import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * ESLint complementa `npm run lint` (tsc --noEmit) com regras que o TypeScript
 * não expressa: ordem de hooks, dependências de efeito, complexidade
 * ciclomática e o uso explícito de `any`. Não substitui o type-check.
 *
 * Escopo deliberadamente pequeno: só as regras da fase F5. Um preset
 * "recommended" completo produziria centenas de achados de estilo e esconderia
 * os que importam.
 */
export default [
  {
    ignores: ['dist/**', 'dev-dist/**', 'coverage/**', '.quality/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      complexity: ['warn', 15],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
