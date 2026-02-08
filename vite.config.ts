import { defineConfig } from 'vite'
import { remix } from '@remix-run/dev'

export default defineConfig({
  plugins: [remix()],
})
