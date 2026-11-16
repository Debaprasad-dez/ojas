import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Builds (and `vite preview`) are served from GitHub Pages at /ojas/; the dev server stays at /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/ojas/' : '/',
  plugins: [react()],
}))
