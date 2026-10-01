import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  dataApi: true,
  // Branch AI Gateway (Phase 4): REMOVED 2026-09-19 — `neon deploy` refuses
  // `aiGateway: true` on the Free plan (gateway already enabled on the branch
  // but won't serve). The Function auto-uses the direct Gemini endpoint with
  // server-side GEMINI_API_KEY. Re-add this flag after upgrading to paid.
  // aiGateway: true,
  functions: {
    api: {
      name: "api proxy",
      source: "functions/api/src/index.ts",
      env: {
        // IndianAPI.in key (server-only). Falls back to the legacy VITE_ var
        // during transition; set INDIAN_API_KEY to silence the fallback.
        INDIAN_API_KEY: process.env.INDIAN_API_KEY ?? process.env.VITE_INDIAN_API_KEY!,
        // Google Cloud key for Weather + Geocoding (server-only). Today this
        // is the same shared key the client used as VITE_GEMINI_API_KEY.
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ?? process.env.VITE_GEMINI_API_KEY!,
        // Gemini key for the direct fallback when gateway creds are absent.
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY!,
        // Optional: comma-separated extra origins (code defaults cover
        // localhost + *.github.io). Omit to leave the live value untouched.
      },
    },
  },
});
