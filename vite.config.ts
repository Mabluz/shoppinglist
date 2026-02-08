import { defineConfig } from 'vite'
import { remix } from '@remix-run/dev'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [remix()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
