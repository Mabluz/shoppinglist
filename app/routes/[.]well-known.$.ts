import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'

// Catch-all route for .well-known requests
// Many tools and browsers probe for these files
export const loader: LoaderFunction = async () => {
  return json({}, { status: 200 })
}
