import { useState, useEffect } from 'react'
import './index.css'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Projects from './components/Projects'
import Payments from './components/Payments'
import InstallPrompt from './components/InstallPrompt'
import {
  Menu,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  RefreshCw,
  LayoutDashboard,
  FolderOpen,
  Users,
  CreditCard,
  X,
} from 'lucide-react'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  clients: 'Customers',
  projects: 'House Design Projects',
  payments: 'Payment Management',
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

  if (!user) return <Login onLogin={handleLogin} />

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard key={refreshKey} onNavigate={navigateTo} />
      case 'clients':
        return <Clients key={refreshKey} />
      case 'projects':
        return <Projects key={refreshKey} onNavigate={navigateTo} />
      case 'payments':
        return <Payments key={refreshKey} />
      default:
        return <Dashboard key={refreshKey} onNavigate={navigateTo} />
    }
  }

  return (
    <div className="app-layout">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar with mobile drawer toggle */}
      <Sidebar
        activePage={page}
        onNavigate={navigateTo}
        user={user}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="main-content">
        {/* PWA Install Notification Prompt */}
        <InstallPrompt />

        {/* Enhanced Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="menu-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              title="Open Navigation"
            >
              <Menu size={22} />
            </button>
            <h1>{PAGE_TITLES[page] || 'Dashboard'}</h1>

            {/* Live Realtime Sync Status Indicator */}
            <div className="live-sync-indicator" title="Connected to Supabase Realtime for instant updates">
              <span className="pulse-dot" />
              <span>Live Sync</span>
            </div>
          </div>

          <div className="top-bar-center">
            <div className="top-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search projects, clients..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="top-bar-right">
            {/* Fast Manual Refresh */}
            <button
              className="top-action-btn"
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
              {theme === 'dark' ? <Sun size={17} color="#ffb547" /> : <Moon size={17} />}
            </button>

            {/* Quick Action: Mark Payment */}
            <button
              className="top-action-btn mint"
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
              <span>{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        <div className="page-content">{renderPage()}</div>

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
