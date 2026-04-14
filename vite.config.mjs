import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "./",
  build: {
    modulePreload: false,
    outDir: "../dist",
    emptyOutDir: true,
  },
});
