import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",

  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,

  dts: false,

  noExternal: [
    "@actions/core",
    "@actions/github",
    "zod",
    "openai"
  ],

  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`
  }
});