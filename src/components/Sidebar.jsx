import React from 'react'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CreditCard,
  LogOut,
  ArrowRight,
  FileSpreadsheet,
  X,
  Sparkles,
  ChevronDown,
  Search,
} from 'lucide-react'
import logoSvg from '../assets/logo.svg'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderOpen, badge: 'Live' },
  { id: 'clients', label: 'Customers', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
]

export default function Sidebar({
  activePage,
  onNavigate,
  user,
  onLogout,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onOpenCustomerLookup,
}) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div
          className="brand"
          onClick={() => onNavigate('dashboard')}
          title="Dreamscape MS"
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-icon">
            <img
              src={logoSvg}
              alt="Dreamscape Logo"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
          </div>
          {!isCollapsed && (
            <div className="brand-text">
              <h2>DREAMSCAPE</h2>
              <span>DESIGN &amp; PLANNING</span>
            </div>
          )}
        </div>

        <div className="sidebar-header-actions">
          {/* Close Button on Mobile Drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="menu-toggle-btn mobile-only-btn"
              style={{ display: isOpen ? 'flex' : 'none' }}
              title="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="sidebar-aeux-top">
          {/* Team Workspace Selector (Matching AeuxGlobal EcoPlastic widget) */}
          <div className="sidebar-workspace-card" title="Active Studio Workspace">
            <div className="sidebar-workspace-left">
              <div className="sidebar-workspace-icon">
                <Sparkles size={14} color="#00d293" />
              </div>
              <div className="sidebar-workspace-info">
                <span className="sidebar-workspace-label">Team Workspace</span>
                <span className="sidebar-workspace-name">Dreamscape Studio</span>
              </div>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </div>

          {/* Quick Search Capsule (Matching AeuxGlobal Search for... ⌘F) */}
          {onOpenCustomerLookup && (
            <div
              className="sidebar-search-capsule"
              onClick={onOpenCustomerLookup}
              title="Search customer mobile number (⌘F)"
            >
              <Search size={14} color="#64748b" />
              <span>Search for...</span>
              <kbd>⌘+F</kbd>
            </div>
          )}
        </div>
      )}

      <nav className="sidebar-nav">
        {!isCollapsed && <div className="nav-section-label">NAVIGATION</div>}
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            title={label}
          >
            <div className="nav-item-left">
              <Icon size={18} strokeWidth={2} />
              {!isCollapsed && <span>{label}</span>}
            </div>
            {!isCollapsed && badge && <span className="nav-badge">{badge}</span>}
            {activePage === id && <div className="nav-indicator" />}
          </button>
        ))}
      </nav>

      {/* Floating Emerald Summary Card (hidden when collapsed) */}
      {!isCollapsed && (
        <div className="sidebar-promo">
          <h4>Summary Report</h4>
          <p>Export all project cashflow &amp; balance statements</p>
          <button className="promo-btn" onClick={() => onNavigate('payments')}>
            <FileSpreadsheet size={13} />
            <span>View Reports</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-user" title={user?.fullName || user?.username || 'Admin'}>
          <div className="user-avatar">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <strong>{user?.fullName || user?.username || 'Admin'}</strong>
              <span>Lead Architect &amp; Admin</span>
            </div>
          )}
        </div>
        <button
          className="logout-btn"
          onClick={onLogout}
          title="Sign Out"
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
