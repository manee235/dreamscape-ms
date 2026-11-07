import { useState, useEffect } from 'react'
import './index.css'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Projects from './components/Projects'
import Payments from './components/Payments'
import InstallPrompt from './components/InstallPrompt'
import CustomerLookupModal from './components/CustomerLookupModal'
import ErrorBoundary from './components/ErrorBoundary'
import {
  Menu,
  Search,
  Plus,
  Sun,
  Moon,
  RefreshCw,
  LayoutDashboard,
  FolderOpen,
  Users,
  CreditCard,
  Phone,
} from 'lucide-react'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  clients: 'Customers',
  projects: 'Projects',
  payments: 'Payments',
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dms_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [page, setPage] = useState('dashboard')
  const [globalSearch, setGlobalSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Customer Mobile Lookup Modal
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false)

  // Desktop Sidebar Collapsed State (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dms_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('dms_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  // Light / Dark Mode State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dms_theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dms_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const triggerFastRefresh = () => {
    setIsRefreshing(true)
    setRefreshKey((k) => k + 1)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const handleLogin = (u) => {
    setUser(u)
    sessionStorage.setItem('dms_user', JSON.stringify(u))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('dms_user')
    setPage('dashboard')
    setMobileMenuOpen(false)
  }

  const navigateTo = (p) => {
    setPage(p)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!user) {
    return (
      <>
        <InstallPrompt />
        <Login onLogin={handleLogin} />
      </>
    )
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            key={refreshKey}
            onNavigate={navigateTo}
            onOpenCustomerLookup={() => setCustomerLookupOpen(true)}
          />
        )
      case 'clients':
        return <Clients key={refreshKey} />
      case 'projects':
        return <Projects key={refreshKey} onNavigate={navigateTo} />
      case 'payments':
        return <Payments key={refreshKey} />
      default:
        return (
          <Dashboard
            key={refreshKey}
            onNavigate={navigateTo}
            onOpenCustomerLookup={() => setCustomerLookupOpen(true)}
          />
        )
    }
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar with mobile drawer toggle & desktop collapse */}
      <Sidebar
        activePage={page}
        onNavigate={navigateTo}
        user={user}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <main className="main-content">
        {/* PWA Install Notification Prompt */}
        <InstallPrompt />

        {/* Customer Mobile Number Lookup Modal */}
        <CustomerLookupModal
          isOpen={customerLookupOpen}
          onClose={() => setCustomerLookupOpen(false)}
          onMarkPayment={() => navigateTo('payments')}
        />

        {/* Clean, Mobile-Optimized Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              className="menu-toggle-btn mobile-only-btn"
              onClick={() => setMobileMenuOpen(true)}
              title="Open Navigation"
            >
              <Menu size={22} />
            </button>

            {/* Desktop Collapse / Expand Toggle Button in Topbar */}
            <button
              className="sidebar-collapse-btn desktop-only-btn"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ marginRight: 8 }}
            >
              <Menu size={19} />
            </button>
            <h1 className="top-bar-title">{PAGE_TITLES[page] || 'Dashboard'}</h1>

            {/* Live Realtime Sync Status Indicator */}
            <div className="live-sync-indicator" title="Connected to Supabase Realtime for instant updates">
              <span className="pulse-dot" />
              <span className="live-sync-text">Live Sync</span>
            </div>
          </div>

          <div className="top-bar-center">
            <div
              className="top-search-box"
              style={{ cursor: 'pointer' }}
              onClick={() => setCustomerLookupOpen(true)}
            >
              <Phone size={15} color="var(--primary)" />
              <input
                type="text"
                placeholder="Search customer by mobile number..."
                readOnly
                style={{ cursor: 'pointer' }}
              />
              <kbd style={{ fontSize: 10, background: 'var(--border-color)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                Mobile #
              </kbd>
            </div>
          </div>

          <div className="top-bar-right">
            {/* Mobile Lookup Button */}
            <button
              className="top-action-btn mobile-lookup-btn"
              title="Search Customer Mobile Number"
              onClick={() => setCustomerLookupOpen(true)}
            >
              <Phone size={15} color="var(--primary)" />
            </button>

            {/* Fast Manual Refresh (Desktop only, mobile has bottom bar & realtime) */}
            <button
              className="top-action-btn desktop-only-btn"
              title="Fast Data Refresh"
              onClick={triggerFastRefresh}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'refresh-spinning' : ''}
              />
            </button>

            {/* Light / Dark Mode Switcher */}
            <button
              className="top-action-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} />}
            </button>

            {/* Quick Action: Mark Payment (Desktop only, mobile has floating center action) */}
            <button
              className="top-action-btn mint desktop-only-btn"
              title="Mark New Payment"
              onClick={() => navigateTo('payments')}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>

            {/* Admin Avatar Chip */}
            <div className="user-profile-chip" onClick={() => navigateTo('dashboard')}>
              <div className="chip-avatar">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="user-profile-name">{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </div>

        {/* Mobile Native Bottom Navigation Bar */}
        <nav className="mobile-bottom-bar">
          <button
            className={`mobile-nav-btn ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </button>

          <button
            className={`mobile-nav-btn ${page === 'projects' ? 'active' : ''}`}
            onClick={() => navigateTo('projects')}
          >
            <FolderOpen size={20} />
            <span>Projects</span>
          </button>

          {/* Center Floating Action Button */}
          <button
            className="mobile-nav-center-action"
            title="Mark Payment"
            onClick={() => navigateTo('payments')}
          >
            <Plus size={24} strokeWidth={2.8} />
          </button>

          <button
            className={`mobile-nav-btn ${page === 'clients' ? 'active' : ''}`}
            onClick={() => navigateTo('clients')}
          >
            <Users size={20} />
            <span>Clients</span>
          </button>

          <button
            className={`mobile-nav-btn ${page === 'payments' ? 'active' : ''}`}
            onClick={() => navigateTo('payments')}
          >
            <CreditCard size={20} />
            <span>Payments</span>
          </button>
        </nav>
      </main>
    </div>
  )
}

export default App
