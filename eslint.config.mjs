// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  ...compat.extends(
    "next",
    "next/core-web-vitals",
    "next/typescript",
    "prettier" // prettier를 마지막에
  ),
  {
    rules: {
      "no-unused-vars": "warn",
      semi: "off", // Prettier가 처리하도록
      "prettier/prettier": "off", // 일시적으로 비활성화
    },
  },
  {
    ignores: ["src/lib/types/types.ts", "*.d.ts", "node_modules/**", ".next/**"],
  },
];
