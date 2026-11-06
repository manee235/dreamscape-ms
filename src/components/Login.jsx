import React, { useState } from 'react'
import { Home, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../supabase'

const DEFAULT_CREDENTIALS = {
  username: 'isanka.t',
  password: 'thari@creation',
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          setError('Invalid password. Please check and try again.')
          setLoading(false)
          return
        }
      }

      // 2. Fallback to default admin credentials
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
        {/* Brand Header */}
        <div className="login-logo">
          <div className="login-logo-badge">
            <Home size={26} strokeWidth={2.2} />
          </div>
          <h1>Dreamscape MS</h1>
          <p>House Design &amp; Planning Agency Management</p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="login-error">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Admin Username
            </label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <User size={16} />
              </span>
              <input
                type="text"
                className="login-input-field"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1, color: 'var(--primary)' }} />
          Admin secure authentication &bull; Dreamscape MS v2.0
        </div>
      </div>
    </div>
  )
}
