// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends(
    "plugin:prettier/recommended",
    "next",
    "next/core-web-vitals",
    "next/typescript"
  ),
  {
    rules: {
      "no-unused-vars": "warn",
      "semi": ["warn", "always"],
      "prettier/prettier": "warn"
    }
  }
];
