import type { LinksFunction } from '@remix-run/node'
import type { MetaFunction } from '@remix-run/react'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import styles from './styles/app.css?url'

export const meta: MetaFunction = () => [
  { title: 'Handleliste' },
  { name: 'description', content: 'Enkel handleliste for telefonen' },
  { viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
  { name: 'theme-color', content: '#0070f3' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  { name: 'apple-mobile-web-app-title', content: 'Handleliste' },
]

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
  { rel: 'manifest', href: '/manifest.json' },
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
  { rel: 'icon', href: '/icon-192.png', type: 'image/png', sizes: '192x192' },
  { rel: 'apple-touch-icon', href: '/icon-192.png' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
