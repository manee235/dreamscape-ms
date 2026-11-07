import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import logoSvg from '../assets/logo.svg'
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
    } catch {
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
    <div className="mobile-login-wrapper">
      <div className="mobile-login-container">
        {/* Top Dark Hero Section with Emerald Glow & Official Arch Logo */}
        <div className="mobile-login-hero">
          <div className="mobile-login-brand-group">
            <img src={logoSvg} alt="Dreamscape" className="mobile-login-logo-img" />
            <h1 className="mobile-login-brand">Dreamscape Designs</h1>
          </div>
          {/* Emerald green atmospheric glow matching uploaded design */}
          <div className="mobile-login-green-glow" />
        </div>

        {/* Bottom Curved Sheet with top grab handle */}
        <div className="mobile-login-sheet">
          <div className="mobile-sheet-handle" />

          <div className="mobile-login-header">
            <h2 className="mobile-login-title">Welcome Back</h2>
            <p className="mobile-login-subtitle">Enter your details below</p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mobile-login-error">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Clean Login Form */}
          <form className="mobile-login-form" onSubmit={handleSubmit}>
            {/* Username Card */}
            <div className="mobile-input-card">
              <label className="mobile-input-label">Username</label>
              <input
                type="text"
                className="mobile-input-control"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Password Card */}
            <div className="mobile-input-card">
              <label className="mobile-input-label">Password</label>
              <div className="mobile-input-password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="mobile-input-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="mobile-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Green Sign In Button matching Dreamscape theme */}
            <button type="submit" className="mobile-signin-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Minimal Subtle Footer */}
          <div className="mobile-login-footer">
            Admin Access Only &bull; Dreamscape MS
          </div>
        </div>
      </div>
    </div>
  )
}
