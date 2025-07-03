/* eslint-disable import/no-anonymous-default-export */
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next", "next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // JS unused-vars 룰 끄기
      "no-unused-vars": "off",
      // TS unused-vars 룰 끄기
      "@typescript-eslint/no-unused-vars": "off",

      // 기타 기존 설정
      semi: "off",
      "prettier/prettier": "off",
    },
  },
  {
    ignores: ["src/lib/types/types.ts", "*.d.ts", "node_modules/**", ".next/**"],
  },
];
