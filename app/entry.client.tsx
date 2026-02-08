import { RemixBrowser } from '@remix-run/react'
import { hydrate } from 'react-dom/client'

hydrate(
  document,
  <RemixBrowser />
)
