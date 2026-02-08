import type { LinksFunction } from '@remix-run/node'
import type { MetaFunction } from '@remix-run/react'
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import styles from './styles/app.css'

export const meta: MetaFunction = () => [
  { title: 'Shopping List' },
  { name: 'description', content: 'Simple shopping list for your phone' },
  { viewport: 'width=device-width, initial-scale=1' },
]

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
