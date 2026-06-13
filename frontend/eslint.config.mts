import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Не линтить артефакты
  globalIgnores(["dist", "build", "coverage", "node_modules"]),

  {
    settings: {
      react: {
        version: "18.3", // как в package.json: react ^18.3.1
      },
    },
  },

  // База: JS + TS + React
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"], // отключает react-in-jsx-scope
  eslintConfigPrettier,

  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // TypeScript вместо prop-types
      "react/prop-types": "off",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Vite HMR: не экспортировать компоненты из файлов с логикой
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Vitest: globals для тестов
  {
    files: ["**/*.test.{ts,tsx}", "vitest.config.ts", "src/test-setup.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },

  // Node-окружение для конфигов
  {
    files: ["*.config.{ts,mts,js}", "eslint.config.mts"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
