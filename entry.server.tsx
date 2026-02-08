import { PassThrough } from 'stream'
import { createReadableStreamFromReadable } from '@remix-run/node'
import { renderToString } from 'react-dom/server'
import { RemixServer } from '@remix-run/react'
import type { EntryContext } from '@remix-run/cloudflare'

const ABORT_DELAY = 5000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const callback = (error?: any) => {
    if (error) {
      console.error('❌ Remix error:', error)
    }
  }

  return renderToString(
    <RemixServer context={remixContext} url={request.url} />
  ).then(
    (html) => {
      responseHeaders.set('Content-Type', 'text/html')
      return new Response(html, {
        status: responseStatusCode,
        headers: responseHeaders,
      })
    },
    callback
  )
}
