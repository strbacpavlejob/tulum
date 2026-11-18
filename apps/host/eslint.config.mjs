import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tulum from "../../eslint-rules/file-naming.cjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // File and folder names, see docs/conventions.md.
    plugins: { tulum },
    rules: {
      "tulum/file-naming": [
        "error",
        {
          routes: "app",
          middleExtensions: ["d", "test", "spec", "config", "module", "stories"],
        },
      ],
    },
  },
]);

export default eslintConfig;
