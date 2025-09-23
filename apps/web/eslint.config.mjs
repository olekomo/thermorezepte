// apps/web/eslint.config.mjs
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['.next/**', 'node_modules/**'] },

  // Basis JS-Regeln
  js.configs.recommended,

  // Globale Settings (Browser + Node)
  {
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        // Browser
        window: 'readonly',
        document: 'readonly',
        location: 'readonly',
        // Node/Edge
        process: 'readonly',
        URL: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // TypeScript & React
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // TS – optional schärfen:
      // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // React 17+ / 18+ Qualität
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // Hooks-Regeln
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
