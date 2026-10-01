import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
  plugins: [
    react(),
    // Phase 5: offline app shell (precached build assets only — API/data
    // calls always hit the network, never stale caches of financial data).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "FinanceHub — Financial Platform",
        short_name: "FinanceHub",
        description: "AI-powered financial management and kitchen organization.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#6366f1",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Document navigations fall back to the cached shell offline
        // (handled by the plugin's navigation route below).
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // Same-origin subresource/API traffic: never served stale —
            // authenticated financial data must always hit the network.
            // Documents are excluded so the navigation fallback above wins.
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && request.destination !== "document",
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  base: command === "build" && process.env.VERCEL
    ? "/"                      // ✅ When Vercel builds → use root
    : "/financial-analysis/",   // ✅ When GitHub Pages builds → use repo name
  server: {
    proxy: {
      // Proxy for Google Weather API - Current Conditions
      '/api/currentConditions': {
        target: 'https://weather.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/currentConditions/, '/v1/currentConditions:lookup'),
        secure: false,
      },
      // Proxy for Google Weather API - Daily Forecast
      '/api/forecast/days': {
        target: 'https://weather.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/forecast\/days/, '/v1/forecast/days:lookup'),
        secure: false,
      },
      // Proxy for Google Weather API - Hourly Forecast
      '/api/forecast/hours': {
        target: 'https://weather.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/forecast\/hours/, '/v1/forecast/hours:lookup'),
        secure: false,
      },
      // Proxy for Google Geocoding API
      '/api/geocode': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, '/maps/api/geocode'),
        secure: false,
      },
    },
  },
}));
