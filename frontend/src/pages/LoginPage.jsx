import { useState } from 'react'
import { login, register } from '../api/auth'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isRegister) {
        await register(email, name, password)
        setIsRegister(false)
        setError('Account created. Please sign in.')
      } else {
        const token = await login(email, password)
        localStorage.setItem('token', token)
        onLogin(token)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">⚙ Maintenance Copilot</div>
        <div className="login-subtitle">
          {isRegister ? 'Create an account to get started' : 'Sign in to continue'}
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="login-field">
              <label className="login-label">Full name</label>
              <input
                className="login-input"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {error && <div className="login-error">{error}</div>}

        <div className="login-toggle">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError('') }}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  )
}
