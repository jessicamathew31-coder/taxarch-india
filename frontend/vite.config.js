import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The base path must match the GitHub Pages repository name.
// For jessicamathew31-coder.github.io/taxarch-india, base = "/taxarch-india/"
// For a root GitHub Pages site (username.github.io), base = "/"
export default defineConfig({
  plugins: [react()],
  base: "/taxarch-india/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
