import nextPlugin from "@next/eslint-plugin-next";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...tseslintPlugin.configs.recommended.rules,
    },
  },
];

