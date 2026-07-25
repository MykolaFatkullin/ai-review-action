import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  bundle: true,
  clean: true,
  sourcemap: true,
  dts: true,
  minify: false,
  splitting: false,
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`
  }
});