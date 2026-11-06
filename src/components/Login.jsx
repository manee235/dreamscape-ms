import React, { useState } from 'react'
import { Home } from 'lucide-react'
import { supabase } from '../supabase'

const DEFAULT_CREDENTIALS = {
  username: 'isanka',
  password: 'tharindu',
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Try checking against Supabase admin_users table
      const { data, error: dbError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle()

      if (!dbError && data) {
        if (data.password === password) {
          onLogin({ username: data.username, fullName: data.full_name || data.username })
          setLoading(false)
          return
        } else {
          setError('Invalid password. Please try again.')
          setLoading(false)
          return
        }
      }

      // 2. Fallback to hardcoded admin credentials
      if (
        username.trim().toLowerCase() === DEFAULT_CREDENTIALS.username &&
        password === DEFAULT_CREDENTIALS.password
      ) {
        onLogin({ username: DEFAULT_CREDENTIALS.username, fullName: 'Isanka (Admin)' })
      } else {
        setError('Invalid username or password. Please try again.')
      }
    } catch (err) {
      // Offline / network fallback
      if (
        username.trim().toLowerCase() === DEFAULT_CREDENTIALS.username &&
        password === DEFAULT_CREDENTIALS.password
      ) {
        onLogin({ username: DEFAULT_CREDENTIALS.username, fullName: 'Isanka (Admin)' })
      } else {
        setError('Invalid username or password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">
            <Home size={36} />
          </div>
          <h1>Dreamscape MS</h1>
          <p>House Design &amp; Planning Agency</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#94a3b8' }}>
          Admin access only &mdash; Dreamscape Management System
        </p>
      </div>
    </div>
  )
}
