import { useState } from 'react'
import { login, register } from '../api/auth'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setNotice(null)
    try {
      if (isRegister) {
        await register(email, name, password)
        setIsRegister(false)
        setPassword('')
        setNotice({ type: 'success', text: 'Account created — sign in below.' })
      } else {
        const token = await login(email, password)
        onLogin(token)
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setNotice({
        type: 'error',
        text: typeof detail === 'string'
          ? detail
          : err.response
            ? 'Something went wrong. Please try again.'
            : 'Could not reach the server. Is the backend running?',
      })
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">⚙</div>
        <div className="login-title">Maintenance Copilot</div>
        <div className="login-subtitle">
          {isRegister ? 'Create an account to get started' : 'Sign in to continue'}
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="login-field">
              <label className="login-label" htmlFor="name">Full name</label>
              <input
                id="name"
                className="login-input"
                placeholder="Your name"
                value={name}
                required
                autoComplete="name"
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div className="login-field">
            <label className="login-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="login-input"
              placeholder="you@example.com"
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="login-field">
            <label className="login-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="login-input"
              placeholder="••••••••"
              type="password"
              value={password}
              required
              minLength={isRegister ? 6 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {notice && (
          <div className={`login-notice ${notice.type}`}>{notice.text}</div>
        )}

        <div className="login-toggle">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setNotice(null) }}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  )
}
