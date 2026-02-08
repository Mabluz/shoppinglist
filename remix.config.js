import { defineConfig } from '@remix-run/dev'
import type { Plugin } from 'vite'

export default defineConfig({
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
  plugins: [
    {
      name: 'remix',
      enforce: 'post',
      async transform(code, id) {
        if (id.endsWith('.css')) {
          return {
            code: `export default "${code.replace(/`/g, '\\`')}"`,
            map: null,
          }
        }
      },
    } as Plugin,
  ],
  server: {
    port: 3000,
  },
})
