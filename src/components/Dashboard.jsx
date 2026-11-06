import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  Users,
  FolderOpen,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  FileText,
  Calendar,
} from 'lucide-react'

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [activeProjectsList, setActiveProjectsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('Monthly')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [clientsRes, projectsRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      ])

      const clientsList = clientsRes.data || []
      const projectsList = projectsRes.data || []
      const paymentsList = paymentsRes.data || []

      const clientMap = new Map()
      clientsList.forEach((c) => clientMap.set(c.id, c.name))

      const projectMap = new Map()
      projectsList.forEach((p) => projectMap.set(p.id, p))

      const totalRevenue = paymentsList.reduce((s, p) => s + Number(p.amount || 0), 0)
      const totalBudget = projectsList.reduce((s, p) => s + Number(p.total_amount || 0), 0)
      const totalOutstanding = Math.max(0, totalBudget - totalRevenue)
      const activeProjects = projectsList.filter((p) => p.status === 'Active')

      setStats({
        clientsCount: clientsList.length,
        totalProjects: projectsList.length,
        activeCount: activeProjects.length,
        totalRevenue,
        totalBudget,
        totalOutstanding,
        paymentsCount: paymentsList.length,
      })

      // Recent 5 payments
      const recent = paymentsList.slice(0, 5).map((p) => {
        const prj = projectMap.get(p.project_id)
        return {
          ...p,
          clientName: clientMap.get(p.client_id) || 'Client',
          projectName: prj?.project_name || 'House Design',
        }
      })
      setRecentPayments(recent)
      setActiveProjectsList(projectsList.slice(0, 4))
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> Loading dashboard analytics...
      </div>
    )
  }

  return (
    <div>
      {/* TOP ROW: Hero Mint Card + 4 Satellite Metric Cards (matching reference image) */}
      <div className="stats-grid-dashboard">
        {/* 1. Large Mint Gradient Hero Card */}
        <div className="hero-mint-card">
          <div>
            <div className="hero-header">
              <span className="hero-title">Total Collected Revenue</span>
              <span className="hero-badge">
                <ArrowUpRight size={13} /> +18.4%
              </span>
            </div>

            <div className="hero-amount">{fmt(stats?.totalRevenue)}</div>

            {/* Segmented meter dots */}
            <div className="hero-dots">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                <div key={d} className={`hero-dot ${d <= 7 ? 'filled' : ''}`} />
              ))}
            </div>

            <p style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(7, 38, 24, 0.85)', marginBottom: 16 }}>
              Total client payments received for active and ongoing architectural planning projects.
            </p>
          </div>

          <div className="hero-footer">
            <button
              onClick={() => onNavigate('payments')}
              style={{
                background: 'none',
                border: 'none',
                color: '#072618',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View details <ChevronRight size={14} />
            </button>
            <button
              className="hero-action-btn"
              onClick={() => onNavigate('payments')}
            >
              <Calendar size={13} />
              <span>Mark Payment</span>
            </button>
          </div>
        </div>

        {/* 2. Top-Right Column 1: Sparkline Card & Donut Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Total Outstanding Card with Wavy Curve */}
          <div className="stat-metric-card" style={{ flex: 1 }}>
            <div className="stat-metric-header">
              <span className="stat-metric-title">Remaining to Collect</span>
              <span className="badge badge-hold" style={{ fontSize: 10, padding: '2px 8px' }}>
                Pending
              </span>
            </div>
            <div className="stat-metric-val" style={{ color: '#f43f5e' }}>
              {fmt(stats?.totalOutstanding)}
            </div>
            <div className="stat-metric-sub">Client balance across all projects</div>

            {/* Glowing Wavy Line SVG */}
            <svg className="sparkline-svg" viewBox="0 0 200 45">
              <defs>
                <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                d="M 0 35 Q 35 15, 70 30 T 140 10 T 200 20"
                fill="none"
                stroke="url(#gradRed)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Donut Distribution Breakdown */}
          <div className="stat-metric-card" style={{ flex: 1 }}>
            <div className="stat-metric-header">
              <span className="stat-metric-title">Project Portfolio</span>
              <span style={{ fontSize: 11, color: '#00d293', fontWeight: 700 }}>
                {stats?.totalProjects} Total
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              {/* Mini SVG Donut */}
              <svg width="60" height="60" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#232d42" strokeWidth="4.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#00d293"
                  strokeWidth="4.5"
                  strokeDasharray="60 100"
                  strokeLinecap="round"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4.5"
                  strokeDasharray="25 100"
                  strokeDashoffset="-60"
                  strokeLinecap="round"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#ffb547"
                  strokeWidth="4.5"
                  strokeDasharray="15 100"
                  strokeDashoffset="-85"
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d293' }} />
                  <span style={{ color: '#94a3b8' }}>Active ({stats?.activeCount})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                  <span style={{ color: '#94a3b8' }}>Completed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffb547' }} />
                  <span style={{ color: '#94a3b8' }}>On Hold</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                  <span style={{ color: '#94a3b8' }}>Planning</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Top-Right Column 2: Bar Chart Card & Total Clients */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active House Designs with Bar Indicator */}
          <div className="stat-metric-card" style={{ flex: 1 }}>
            <div className="stat-metric-header">
              <span className="stat-metric-title">Active House Designs</span>
              <span className="badge badge-active" style={{ fontSize: 10 }}>
                In Progress
              </span>
            </div>
            <div className="stat-metric-val">{stats?.activeCount}</div>
            <div className="stat-metric-sub">Under architectural drafting</div>

            {/* Vertical Bar Chart Graphic */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 42, marginTop: 10 }}>
              {[35, 60, 45, 80, 50, 90, 75, 95, 60].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === 7 ? '#00d293' : '#232d42',
                    borderRadius: '3px 3px 0 0',
                    boxShadow: i === 7 ? '0 0 10px rgba(0, 210, 147, 0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Total Registered Clients */}
          <div className="stat-metric-card" style={{ flex: 1 }}>
            <div className="stat-metric-header">
              <span className="stat-metric-title">Registered Clients</span>
              <button
                className="btn btn-outline btn-sm"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => onNavigate('clients')}
              >
                View
              </button>
            </div>
            <div className="stat-metric-val">{stats?.clientsCount}</div>
            <div className="stat-metric-sub">Clients actively managing projects</div>

            {/* Glowing Cyan Line */}
            <svg className="sparkline-svg" viewBox="0 0 200 45">
              <path
                d="M 0 30 Q 50 40, 100 20 T 200 15"
                fill="none"
                stroke="#00d293"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Large Smooth Wavy Sales Revenue Chart (Matching Reference) */}
      <div className="chart-row">
        {/* Main Wave Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Cashflow &amp; Revenue Trends</h2>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Financial overview for 2026
              </span>
            </div>
            <div className="period-tabs">
              {['Monthly', 'Weekly', 'Daily'].map((t) => (
                <button
                  key={t}
                  className={`period-tab ${timeframe === t ? 'active' : ''}`}
                  onClick={() => setTimeframe(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            {/* Custom SVG Glowing Wave Chart */}
            <div style={{ position: 'relative', width: '100%', height: 220 }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 220"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Neon Glow Gradient */}
                  <linearGradient id="waveGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d293" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#00d293" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Grid lines */}
                  <pattern id="gridPattern" width="80" height="40" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="40" x2="80" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect width="100%" height="100%" fill="url(#gridPattern)" />

                {/* Shaded Area */}
                <path
                  d="M 0 170 Q 120 180, 220 130 T 420 80 T 540 140 T 680 70 L 800 120 L 800 220 L 0 220 Z"
                  fill="url(#waveGlow)"
                />

                {/* Glowing Smooth Wave Path */}
                <path
                  d="M 0 170 Q 120 180, 220 130 T 420 80 T 540 140 T 680 70 L 800 120"
                  fill="none"
                  stroke="#00d293"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Second Accent Wave (Blue) */}
                <path
                  d="M 0 190 Q 150 140, 300 160 T 600 100 L 800 150"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />

                {/* Peak Indicator Dot at 680, 70 */}
                <circle cx="680" cy="70" r="7" fill="#00d293" />
                <circle cx="680" cy="70" r="14" fill="#00d293" opacity="0.3" />
                <line x1="680" y1="70" x2="680" y2="220" stroke="#00d293" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
              </svg>

              {/* Peak Tooltip Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '12%',
                  right: '12%',
                  background: '#131926',
                  border: '1px solid #00d293',
                  borderRadius: 8,
                  padding: '4px 10px',
                  boxShadow: '0 4px 16px rgba(0, 210, 147, 0.3)',
                }}
              >
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Peak Milestone</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#00d293' }}>Rs. 850,000</div>
              </div>
            </div>

            {/* Months Label Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#64748b',
                marginTop: 10,
                padding: '0 8px',
              }}
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                <span key={m} style={{ color: m === 'Oct' ? '#00d293' : '#64748b', fontWeight: m === 'Oct' ? 700 : 400 }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Side Performance / Best Selling Plans */}
        <div className="card">
          <div className="card-header">
            <h2>Active Design Progress</h2>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 10px' }}
              onClick={() => onNavigate('projects')}
            >
              All Projects
            </button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeProjectsList.map((p) => {
              const total = Number(p.total_amount || 0)
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: '#ffffff' }}>{p.project_name}</strong>
                    <span style={{ fontSize: 12, color: '#00d293', fontWeight: 700 }}>
                      {fmt(total)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                    <span>{p.project_type}</span>
                    <span>{p.status}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: p.status === 'Completed' ? '100%' : '65%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Recent Client Payments Table */}
      <div className="card">
        <div className="card-header">
          <h2>Recent Payment Transactions</h2>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('payments')}>
            Mark New Payment
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>House Design Project</th>
                <th>Amount Received</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.clientName}</strong>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{p.projectName}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#00d293', fontSize: 14 }}>
                        {fmt(p.amount)}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#101522',
                          border: '1px solid #232d42',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#94a3b8',
                        }}
                      >
                        {p.payment_method}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>
                      {new Date(p.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td>
                      <span className="badge badge-active">✓ Received</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
