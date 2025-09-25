// apps/web/eslint.config.mjs
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'              // ⬅️ neu

export default [
  { ignores: ['.next/**', 'node_modules/**'] },

  js.configs.recommended,

  // Globale Settings (Browser + Node)
  {
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        ...globals.browser,                // ⬅️ Browser-Globals (File, Blob, Image, navigator, etc.)
        ...globals.node,                   // ⬅️ Node-Globals (process, etc.)
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
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
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
      // TS-Projekte: TS-Checker kümmert sich um undef—deaktiviert no-undef in TS-Files
      'no-undef': 'off',                  // ⬅️ wichtig gegen deine jetzigen Fehler
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
