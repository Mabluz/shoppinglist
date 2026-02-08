import { defineConfig } from 'vite'
import { vitePlugin as remix } from '@remix-run/dev'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [remix()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
