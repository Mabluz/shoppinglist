import { PassThrough } from 'stream'
import { createReadableStreamFromReadable } from '@remix-run/node'
import * as isbot from 'isbot'
import { renderToString } from 'react-dom/server'
import { RemixServer } from '@remix-run/react'
import type { EntryContext } from '@remix-run/express'
import type { FC } from 'react'

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

  return isbot(request.headers.get('user-agent'))
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext, callback)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext, callback)
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  callback: (error?: any) => void
) {
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

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  callback: (error?: any) => void
) {
  const { pipe, abort } = renderToPipeableStream(
    <RemixServer context={remixContext} url={request.url} />
  )

  setTimeout(abort, ABORT_DELAY)

  const body = PassThrough()
  pipe(body)

  return new Response(createReadableStreamFromReadable(body), {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}
