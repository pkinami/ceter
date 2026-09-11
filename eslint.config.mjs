import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  {
    ignores: [
      ".cache/**",
      ".codex-chrome/**",
      ".next/**",
      ".tmp/**",
      ".vercel/**",
      "screens/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "**/*.storage-state.json",
      "**/*cdp*.json",
      "**/*.log",
      "node_modules/**",
      "vendor/**",
      "next-env.d.ts"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];

export default eslintConfig;
