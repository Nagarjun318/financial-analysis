import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/financial-analysis/',   // ✅ Required for GitHub Pages
})
