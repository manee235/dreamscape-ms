import React, { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  MapPin,
  Moon,
  Sun,
  LogOut,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react'
import logoSvg from '../assets/logo.svg'

export default function Settings({ user, onLogout, theme, onToggleTheme, onNavigate }) {
  const [copied, setCopied] = useState(false)

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText('0779962051')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const username = user?.username || 'isanka.t'
  const displayName = user?.fullName || (user?.username === 'isanka.t' ? 'Isanka Thiwanka' : user?.username || 'Admin User')

  return (
    <div className="settings-page-container">
      {/* Page Header */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Studio Settings</h1>
          <p className="settings-sub">Manage administrator profile, agency branding &amp; system preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card profile-hero-card">
          <div className="profile-hero-top">
            <div className="profile-avatar-large">
              <span className="profile-initial">{username[0]?.toUpperCase() || 'A'}</span>
              <span className="profile-status-dot" title="Active Administrator" />
            </div>
            <div className="profile-hero-info">
              <div className="profile-hero-name-row">
                <h2>{displayName}</h2>
                <span className="profile-badge-pill">
                  <Shield size={12} /> Lead Architect
                </span>
              </div>
              <p className="profile-hero-handle">@{username} · Dreamscape Administrator</p>
              <div className="profile-live-tag">
                <span className="live-dot-pulse" />
                <span>Live Supabase Cloud Sync</span>
              </div>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <div className="profile-detail-icon">
                <Mail size={16} color="#059669" />
              </div>
              <div className="profile-detail-text">
                <label>Official Email</label>
                <span>inquiries@dreamscapedesigns.lk</span>
              </div>
            </div>

            <div className="profile-detail-item" onClick={handleCopyPhone} style={{ cursor: 'pointer' }} title="Click to copy hotline">
              <div className="profile-detail-icon">
                <Phone size={16} color="#059669" />
              </div>
              <div className="profile-detail-text">
                <label>Studio Hotline {copied && <strong style={{ color: '#059669' }}>· Copied!</strong>}</label>
                <span>0779962051</span>
              </div>
            </div>

            <div className="profile-detail-item">
              <div className="profile-detail-icon">
                <Building size={16} color="#059669" />
              </div>
              <div className="profile-detail-text">
                <label>Primary Office</label>
                <span>252/2 Kanduboda, Bamunakotuwa</span>
              </div>
            </div>

            <div className="profile-detail-item">
              <div className="profile-detail-icon">
                <MapPin size={16} color="#059669" />
              </div>
              <div className="profile-detail-text">
                <label>Operating Region</label>
                <span>Kurunegala, North Western Province, Sri Lanka</span>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Branding & PDF Receipts Preview */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-sq">
              <FileText size={18} color="#059669" />
            </div>
            <div>
              <h3>Agency Branding &amp; PDF Receipts</h3>
              <p>Header configuration for invoices, receipts &amp; printouts</p>
            </div>
          </div>

          <div className="pdf-preview-snippet">
            <div className="pdf-preview-header">
              <div className="pdf-logo-box">
                <img src={logoSvg} alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              </div>
              <div>
                <strong style={{ fontSize: 13, letterSpacing: 0.5, color: '#f8fafc' }}>DREAMSCAPE</strong>
                <span style={{ display: 'block', fontSize: 9, color: '#059669', fontWeight: 700 }}>
                  HOUSE DESIGN &amp; PLANNING AGENCY
                </span>
                <span style={{ display: 'block', fontSize: 8, color: '#94a3b8' }}>
                  252/2 Kanduboda, Bamunakotuwa | Tel: 0779962051
                </span>
              </div>
            </div>
            <div className="pdf-preview-status">
              <CheckCircle2 size={13} color="#059669" />
              <span>Official Arch Logo &amp; LKR Currency formatting active</span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onNavigate('payments')}
            >
              <Printer size={15} />
              <span>Open Payment Receipts Log</span>
            </button>
          </div>
        </div>

        {/* System & Appearance Preferences */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-sq">
              <Sparkles size={18} color="#059669" />
            </div>
            <div>
              <h3>Display &amp; Theme</h3>
              <p>Customize the visual interface mode</p>
            </div>
          </div>

          <div className="theme-toggle-row">
            <div>
              <strong>Interface Appearance</strong>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Obsidian Dark with Glass Blur' : 'AeuxGlobal Crisp Light Canvas'}
              </span>
            </div>
            <button
              className="btn btn-outline"
              onClick={onToggleTheme}
              style={{ minWidth: 120, justifyContent: 'center' }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} color="#eab308" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#38bdf8" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          <div className="preference-item-row" style={{ marginTop: 16 }}>
            <div>
              <strong>Currency Standard</strong>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                LKR (Rs.) · Sri Lankan Rupee with 2 decimal precision
              </span>
            </div>
            <span className="pref-tag">LKR (Rs.)</span>
          </div>

          <div className="preference-item-row" style={{ marginTop: 16 }}>
            <div>
              <strong>Primary Theme Accent</strong>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                Rich Emerald Green (#059669)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#059669', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>#059669</span>
            </div>
          </div>
        </div>

        {/* Sign Out Card (Prominent & Clean) */}
        <div className="settings-card danger-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-sq danger">
              <LogOut size={18} color="#f43f5e" />
            </div>
            <div>
              <h3 style={{ color: '#f43f5e' }}>Account Session</h3>
              <p>End your administrative session on this device</p>
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
            Signing out will clear your local administrative access. You can log back in at any time with your credentials.
          </p>

          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out from Dreamscape MS?')) {
                onLogout()
              }
            }}
          >
            <LogOut size={16} />
            <span>Sign Out of Dreamscape MS</span>
          </button>
        </div>
      </div>
    </div>
  )
}
