import { useState, type SubmitEvent } from 'react'
import { api, type User } from './api'

export default function AuthForm({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'coordinator'>('student')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const body =
        mode === 'login'
          ? { email, password }
          : {
              name,
              email,
              password,
              role,
              inviteCode: role === 'coordinator' ? inviteCode : undefined,
            }
      const user = await api<User>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      onAuth(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h2>{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
      <form className="create-form" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <>
            <label htmlFor="auth-name">Name</label>
            <input
              id="auth-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </>
        )}

        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="auth-password">Password (8 or more characters)</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        {mode === 'signup' && (
          <>
            <label htmlFor="auth-role">I am a</label>
            <select
              id="auth-role"
              value={role}
              onChange={(event) => setRole(event.target.value as 'student' | 'coordinator')}
            >
              <option value="student">Student</option>
              <option value="coordinator">Organization coordinator</option>
            </select>

            {role === 'coordinator' && (
              <>
                <label htmlFor="auth-invite">Coordinator invite code</label>
                <input
                  id="auth-invite"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  required
                />
              </>
            )}
          </>
        )}

        {error && <p role="alert" className="error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setError('')
            setMode(mode === 'login' ? 'signup' : 'login')
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </>
  )
}