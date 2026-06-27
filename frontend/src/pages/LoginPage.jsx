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
        setError('Account created. Please login.')
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
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>🔧 Maintenance Copilot</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        {isRegister ? 'Create an account' : 'Sign in to continue'}
      </p>

      {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        )}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>

      <p style={{ marginTop: 16, color: '#666', cursor: 'pointer' }}
        onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
      </p>
    </div>
  )
}

const inputStyle = {
  display: 'block', width: '100%', padding: '10px 12px',
  marginBottom: 12, borderRadius: 8, border: '1px solid #ddd',
  fontSize: 15, boxSizing: 'border-box'
}

const btnStyle = {
  width: '100%', padding: '12px', backgroundColor: '#1a1a1a',
  color: 'white', border: 'none', borderRadius: 8,
  fontSize: 15, cursor: 'pointer', marginTop: 4
}
