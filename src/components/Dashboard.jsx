import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  TrendingUp,
  FolderOpen,
  Users,
  Compass,
  ArrowUpRight,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react'

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [activeProjectsList, setActiveProjectsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('Week')
  const [showForecast, setShowForecast] = useState(true)

  useEffect(() => {
    fetchData()

    // Realtime listener for live sync
    const channel = supabase
      .channel('realtime-dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      const completedProjects = projectsList.filter((p) => p.status === 'Completed')

      const collectionRate = totalBudget > 0 ? Math.round((totalRevenue / totalBudget) * 100) : 0
      const avgContract = projectsList.length > 0 ? Math.round(totalBudget / projectsList.length) : 0

      setStats({
        clientsCount: clientsList.length,
        totalProjects: projectsList.length,
        activeCount: activeProjects.length,
        completedCount: completedProjects.length,
        totalRevenue,
        totalBudget,
        totalOutstanding,
        collectionRate,
        avgContract,
        paymentsCount: paymentsList.length,
      })

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

  if (loading && !stats) {
    return (
      <div className="loading">
        <div className="spinner" /> Loading live design analytics...
      </div>
    )
  }

  return (
    <div>
      {/* 4 TOP OBSIDIAN CARDS (Matching WindPulse: Total Energy, Active Turbines, Wind Speed, Efficiency) */}
      <div className="obsidian-grid-4">
        {/* 1. Total Revenue Collected */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Total Revenue Collected</span>
            <div className="glow-badge-icon emerald">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val" style={{ color: 'var(--primary)' }}>
            {fmt(stats?.totalRevenue)}
          </div>
          <div className="obsidian-card-footer">
            <span className="trend-pill positive">
              <ArrowUpRight size={13} /> +18.4% Since last month
            </span>
            <span className="card-mini-link" onClick={() => onNavigate('payments')}>
              View More ↗
            </span>
          </div>
        </div>

        {/* 2. Active Projects */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Active House Designs</span>
            <div className="glow-badge-icon purple">
              <FolderOpen size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val">
            {stats?.activeCount}/{stats?.totalProjects} <span className="unit">Plans</span>
          </div>
          <div className="obsidian-card-footer">
            <span>Last plan updated 2h ago</span>
            <span className="card-mini-link" onClick={() => onNavigate('projects')}>
              View Plans ↗
            </span>
          </div>
        </div>

        {/* 3. Outstanding Balance */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Outstanding Client Due</span>
            <div className="glow-badge-icon amber">
              <Clock size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val" style={{ color: Number(stats?.totalOutstanding) > 0 ? '#f43f5e' : 'var(--primary)' }}>
            {fmt(stats?.totalOutstanding)}
          </div>
          <div className="obsidian-card-footer">
            <span className="trend-pill negative" style={{ color: Number(stats?.totalOutstanding) > 0 ? '#f43f5e' : 'var(--primary)' }}>
              {Number(stats?.totalOutstanding) > 0 ? 'Pending milestones' : 'All cleared'}
            </span>
            <span className="card-mini-link" onClick={() => onNavigate('payments')}>
              Collect ↗
            </span>
          </div>
        </div>

        {/* 4. Collection Efficiency */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Collection Efficiency</span>
            <div className="glow-badge-icon blue">
              <Compass size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val">
            {stats?.collectionRate}% <span className="unit">Rate</span>
          </div>
          <div className="obsidian-card-footer">
            <span>Target: 85% overall</span>
            <span className="card-mini-link">Efficiency ↗</span>
          </div>
        </div>
      </div>

      {/* MAIN SECTION: Wave Chart (Left) + 2x2 Conditions Matrix (Right) (Exact Match to WindPulse) */}
      <div className="obsidian-main-row">
        {/* Left: Wave Chart Card ("Energy Output & AI Prediction" style) */}
        <div className="wave-chart-card" style={{ position: 'relative' }}>
          <div className="wave-chart-header">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Cashflow &amp; Forecast Revenue
              </h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Weekly billing trends &amp; architectural milestone projections
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="pill-tabs">
                {['Week', 'Month', 'Year'].map((p) => (
                  <button
                    key={p}
                    className={`pill-tab ${timeframe === p ? 'active' : ''}`}
                    onClick={() => setTimeframe(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Forecast Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                onClick={() => setShowForecast(!showForecast)}
              >
                <span>Forecast</span>
                <div
                  style={{
                    width: 32,
                    height: 18,
                    borderRadius: 99,
                    background: showForecast ? 'var(--primary)' : 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: showForecast ? '#0c1c14' : 'var(--text-muted)',
                      position: 'absolute',
                      top: 1,
                      left: showForecast ? 15 : 2,
                      transition: 'all 0.2s',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SVG Wave Chart */}
          <div style={{ position: 'relative', width: '100%', height: 230 }}>
            <svg width="100%" height="100%" viewBox="0 0 700 230" preserveAspectRatio="none">
              <defs>
                <linearGradient id="emeraldWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d293" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00d293" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="50" x2="700" y2="50" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.4" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.4" />
              <line x1="0" y1="150" x2="700" y2="150" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.4" />

              {/* Vertical Dashed Marker at Thursday */}
              <line x1="380" y1="30" x2="380" y2="210" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

              {/* Solid Filled Wave Area */}
              <path
                d="M 0 180 Q 90 190, 180 140 T 360 110 T 520 70 L 700 130 L 700 230 L 0 230 Z"
                fill="url(#emeraldWave)"
              />

              {/* Solid Glowing Emerald Wave */}
              <path
                d="M 0 180 Q 90 190, 180 140 T 360 110 T 520 70 L 700 130"
                fill="none"
                stroke="#00d293"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Secondary Dashed Cyan Forecast Line (Matching Screenshot) */}
              {showForecast && (
                <path
                  d="M 0 150 Q 120 100, 240 160 T 480 80 L 700 60"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.75"
                />
              )}

              {/* Marker Points */}
              <circle cx="380" cy="110" r="6" fill="#00d293" />
              <circle cx="380" cy="110" r="12" fill="#00d293" opacity="0.25" />
            </svg>

            {/* Floating Milestone Tooltip (Matching Screenshot) */}
            <div className="wave-tooltip-box">
              <div className="wave-tooltip-date">Milestone Inspection • Thu 02, 2026</div>
              <div className="wave-tooltip-item">
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>• Collected:</span>
                <strong>Rs. 350,000</strong>
              </div>
              <div className="wave-tooltip-item">
                <span style={{ color: '#38bdf8' }}>• Projection:</span>
                <span style={{ color: 'var(--text-secondary)' }}>Rs. 500,000</span>
              </div>
            </div>
          </div>

          {/* Days Bar */}
          <div className="chart-days-bar">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span
                key={d}
                style={{
                  color: d === 'Thu' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: d === 'Thu' ? 700 : 400,
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Portfolio Metrics Grid ("Atmospheric Conditions" style) */}
        <div className="obsidian-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="obsidian-card-top">
              <div>
                <span className="obsidian-card-label">Agency Metrics</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>
                  Design Operations
                </h3>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Live</span>
            </div>

            {/* 2x2 Inner Capsule Grid */}
            <div className="conditions-inner-grid">
              <div className="condition-cell">
                <div className="condition-cell-top">
                  <span className="condition-cell-title">Settled Plans</span>
                  <div className="glow-badge-icon emerald" style={{ width: 26, height: 26 }}>
                    <CheckCircle2 size={13} />
                  </div>
                </div>
                <div className="condition-cell-val">
                  {stats?.completedCount} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Plans</span>
                </div>
              </div>

              <div className="condition-cell">
                <div className="condition-cell-top">
                  <span className="condition-cell-title">Total Clients</span>
                  <div className="glow-badge-icon blue" style={{ width: 26, height: 26 }}>
                    <Users size={13} />
                  </div>
                </div>
                <div className="condition-cell-val">
                  {stats?.clientsCount} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Registered</span>
                </div>
              </div>

              <div className="condition-cell">
                <div className="condition-cell-top">
                  <span className="condition-cell-title">Avg Contract</span>
                  <div className="glow-badge-icon amber" style={{ width: 26, height: 26 }}>
                    <Layers size={13} />
                  </div>
                </div>
                <div className="condition-cell-val" style={{ fontSize: 15 }}>
                  {fmt(stats?.avgContract)}
                </div>
              </div>

              <div className="condition-cell">
                <div className="condition-cell-top">
                  <span className="condition-cell-title">Sync State</span>
                  <div className="glow-badge-icon purple" style={{ width: 26, height: 26 }}>
                    <Compass size={13} />
                  </div>
                </div>
                <div className="condition-cell-val" style={{ fontSize: 15, color: 'var(--primary)' }}>
                  100% <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Realtime</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Card at Bottom Right */}
          <div
            style={{
              background: 'var(--bg-card-sub)',
              border: '1px solid var(--border-color)',
              borderRadius: 14,
              padding: '12px 14px',
              marginTop: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={14} color="var(--primary)" />
              <strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>AI Cashflow Forecast</strong>
              <span className="badge badge-active" style={{ fontSize: 9, padding: '1px 6px' }}>+12%</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Next week projected collection: <strong>Rs. 750,000</strong> from detailed MEP milestone inspections.
            </p>
          </div>
        </div>
      </div>

      {/* RECENT PAYMENTS LOG TABLE */}
      <div className="card">
        <div className="card-header">
          <h2>Recent Client Payments</h2>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('payments')}>
            View All Payments
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Architectural Project</th>
                <th>Amount Received</th>
                <th>Payment Method</th>
                <th>Transaction Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.clientName}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.projectName}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 14 }}>
                        {fmt(p.amount)}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-active" style={{ fontSize: 11 }}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(p.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td>
                      <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                        ✓ Confirmed
                      </span>
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
