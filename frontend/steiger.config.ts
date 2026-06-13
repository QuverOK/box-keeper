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
    // features/box-drag contains substantial independent logic (placement physics,
    // drag-image suppression, color utilities) with its own unit tests. The
    // insignificant-slice warning is suppressed because the slice may grow to be
    // consumed by additional widgets (e.g. a mobile canvas view) in the future.
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
    // Widget slices use a consistent *-view naming convention (box-view, item-view,
    // storage-view) to distinguish composite UI blocks from pages and features.
    files: ["./src/widgets/**"],
    rules: {
      "fsd/repetitive-naming": "off",
    },
  },
]);
