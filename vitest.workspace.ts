import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/eval/src/gates/**/*.test.ts"],
          exclude: ["**/node_modules/**", "packages/eval/src/gates/m0-native.test.ts"],
        },
      },
      {
        test: {
          name: "native",
          include: ["packages/eval/src/gates/m0-native.test.ts"],
          exclude: ["**/node_modules/**"],
          fileParallelism: false,
        },
      },
    ],
  },
});
