import type { MetaFunction, ActionFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useNavigation } from '@remix-run/react'
import { verifyPassword, createSession, sessionCookie } from '~/server/auth'

export const meta: MetaFunction = () => {
  return [
    { title: 'Login - Handleliste' },
    { name: 'description', content: 'Logg inn for å få tilgang til handlelisten' },
  ]
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const password = formData.get('password') as string

  if (!password) {
    return json({ error: 'Password is required' }, { status: 400 })
  }

  try {
    const isValid = await verifyPassword(password)
    if (!isValid) {
      return json({ error: 'Invalid password' }, { status: 401 })
    }

    const session = await createSession()
    const headers = new Headers()
    headers.append('Set-Cookie', await sessionCookie.serialize(session))

    return redirect('/', { headers })
  } catch (error) {
    return json({ error: 'Server configuration error' }, { status: 500 })
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div className="password-container">
      <div className="password-box">
        <h1>Handleliste</h1>
        <p>Enter password to access</p>

        <Form method="post" className="password-form">
          <input
            type="password"
            name="password"
            className="password-input"
            placeholder="Password"
            autoFocus
            disabled={isSubmitting}
          />
          <button type="submit" className="password-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </Form>

        {actionData?.error && (
          <p className="error-message">{actionData.error}</p>
        )}
      </div>
    </div>
  )
}
