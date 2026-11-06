import React from 'react'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CreditCard,
  LogOut,
  Compass,
  ArrowRight,
  FileSpreadsheet,
  X,
} from 'lucide-react'

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
}) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Compass size={22} strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <h2>DREAMSCAPE</h2>
            <span>DESIGN &amp; PLANNING</span>
          </div>
        </div>

        {/* Close Button on Mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="menu-toggle-btn"
            style={{ display: isOpen ? 'flex' : 'none' }}
            title="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <div className="nav-item-left">
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </div>
            {badge && <span className="nav-badge">{badge}</span>}
            {activePage === id && <div className="nav-indicator" />}
          </button>
        ))}
      </nav>

      {/* Floating Emerald Summary Card */}
      <div className="sidebar-promo">
        <h4>Summary Report</h4>
        <p>Export all project cashflow &amp; balance statements</p>
        <button className="promo-btn" onClick={() => onNavigate('payments')}>
          <FileSpreadsheet size={13} />
          <span>View Reports</span>
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="user-info">
            <strong>{user?.fullName || user?.username || 'Admin'}</strong>
            <span>Lead Architect &amp; Admin</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
