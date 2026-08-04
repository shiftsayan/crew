import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tailwindCanonicalClasses from "eslint-plugin-tailwind-canonical-classes";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
      "tailwind-canonical-classes": tailwindCanonicalClasses,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.flat.recommended.rules,
      "tailwind-canonical-classes/tailwind-canonical-classes": [
        "error",
        { cssPath: "./src/app/globals.css" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".next-*/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    "supabase/.temp/**",
  ]),
]);
