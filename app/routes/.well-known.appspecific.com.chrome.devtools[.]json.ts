import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'

// Chrome DevTools looks for this file when debugging PWAs
// Return an empty object to prevent 404 errors
export const loader: LoaderFunction = async () => {
  return json({})
}
