import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
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
