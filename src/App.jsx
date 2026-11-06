import { useState } from 'react'
import './index.css'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Projects from './components/Projects'
import Payments from './components/Payments'
import {
  Menu,
  Search,
  Plus,
  Bell,
  Mail,
  SlidersHorizontal,
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

  const handleLogin = (u) => {
    setUser(u)
    sessionStorage.setItem('dms_user', JSON.stringify(u))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('dms_user')
    setPage('dashboard')
  }

  if (!user) return <Login onLogin={handleLogin} />

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={setPage} />
      case 'clients':
        return <Clients />
      case 'projects':
        return <Projects onNavigate={setPage} />
      case 'payments':
        return <Payments />
      default:
        return <Dashboard onNavigate={setPage} />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        user={user}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {/* Top bar matching reference screenshot */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="menu-toggle-btn" title="Navigation">
              <Menu size={20} />
            </button>
            <h1>{PAGE_TITLES[page] || 'Dashboard'}</h1>
          </div>

          <div className="top-bar-center">
            <div className="top-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search here..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="top-bar-right">
            <button
              className="top-action-btn mint"
              title="Record Payment"
              onClick={() => setPage('payments')}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
            <button className="top-action-btn" title="Messages">
              <Mail size={16} />
            </button>
            <button className="top-action-btn" title="Notifications">
              <Bell size={16} />
              <div className="dot-badge" />
            </button>
            <div className="user-profile-chip" onClick={() => setPage('dashboard')}>
              <div className="chip-avatar">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <span>{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        <div className="page-content">{renderPage()}</div>
      </main>
    </div>
  )
}

export default App
