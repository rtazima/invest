import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Força tipos explícitos em funções exportadas
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Nunca usar any
      "@typescript-eslint/no-explicit-any": "error",
      // Nunca usar ! assertion sem comentário
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
];

export default eslintConfig;
