import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";
export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: [
      "./src/entities/**/api/**",
      "./src/entities/**/index.ts",
      "./src/features/**/ui/**",
      "./src/app/**",
    ],
    rules: {
      "fsd/no-public-api-sidestep": "off",
    },
  },
  {
    files: [
      "./src/features/box-drag/**",
      "./src/features/box-validation/**",
      "./src/features/layout-drag/**",
    ],
    rules: {
      "fsd/insignificant-slice": "off",
    },
  },
  {
    files: ["./src/widgets/**"],
    rules: {
      "fsd/repetitive-naming": "off",
    },
  },
]);
