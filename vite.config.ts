import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" && process.env.VERCEL
    ? "/"                      // ✅ When Vercel builds → use root
    : "/financial-analysis/",   // ✅ When GitHub Pages builds → use repo name
}));
