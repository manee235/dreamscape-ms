import { useState, useEffect } from 'react'
import './index.css'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Projects from './components/Projects'
import Payments from './components/Payments'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  projects: 'Projects',
  payments: 'Payments',
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dms_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [page, setPage] = useState('dashboard')

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
      case 'dashboard': return <Dashboard onNavigate={setPage} />
      case 'clients':   return <Clients />
      case 'projects':  return <Projects onNavigate={setPage} />
      case 'payments':  return <Payments />
      default:          return <Dashboard onNavigate={setPage} />
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
        <div className="top-bar">
          <h1>{PAGE_TITLES[page] || 'Dashboard'}</h1>
          <span className="top-bar-meta">
            Dreamscape MS &mdash; {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div className="page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
