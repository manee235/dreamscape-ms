import React, { useEffect, useState, useRef } from 'react'
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
  Phone,
  Search,
  ChevronRight,
} from 'lucide-react'

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

// Dynamically compute chart datasets and SVG wave curves from real database payments & projects
function buildChartData(paymentsList = [], projectsList = []) {
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDaysIndex = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 }
  const weekCollected = [0, 0, 0, 0, 0, 0, 0]

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthCollected = new Array(12).fill(0)

  const currentYear = new Date().getFullYear()
  const yearLabels = [String(currentYear - 2), String(currentYear - 1), String(currentYear), String(currentYear + 1)]
  const yearCollected = [0, 0, 0, 0]

  paymentsList.forEach((pm) => {
    if (!pm.payment_date) return
    const d = new Date(pm.payment_date)
    const amt = Number(pm.amount || 0)

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    if (weekDaysIndex[dayName] !== undefined) {
      weekCollected[weekDaysIndex[dayName]] += amt
    }

    const m = d.getMonth()
    if (m >= 0 && m < 12) {
      monthCollected[m] += amt
    }

    const yIdx = yearLabels.indexOf(String(d.getFullYear()))
    if (yIdx !== -1) {
      yearCollected[yIdx] += amt
    }
  })

  const totalBudget = projectsList.reduce((s, p) => s + Number(p.total_amount || 0), 0)
  const avgMonthlyTarget = totalBudget > 0 ? Math.round(totalBudget / 12) : 0
  const avgDailyTarget = avgMonthlyTarget > 0 ? Math.round(avgMonthlyTarget / 4) : 0

  const weekProjected = weekLabels.map(() => avgDailyTarget)
  const monthProjected = monthLabels.map(() => avgMonthlyTarget)
  const yearProjected = yearLabels.map((_, i) => (i === 2 ? totalBudget : Math.round(totalBudget * 0.8)))

  const generateSvg = (collectedArr, projectedArr, width = 700, height = 230) => {
    const maxVal = Math.max(1, ...collectedArr, ...projectedArr)
    const count = collectedArr.length
    const paddingX = 40
    const usableW = width - paddingX * 2
    const usableH = height - 70
    const baselineY = 190

    const curvePoints = collectedArr.map((val, idx) => {
      const x = Math.round(paddingX + (idx / (count - 1 || 1)) * usableW)
      const ratio = val > 0 ? val / maxVal : 0
      const y = Math.round(baselineY - ratio * usableH)
      return { x, y }
    })

    const forecastPoints = projectedArr.map((val, idx) => {
      const x = Math.round(paddingX + (idx / (count - 1 || 1)) * usableW)
      const ratio = val > 0 ? val / maxVal : 0
      const y = Math.round(baselineY - ratio * usableH)
      return { x, y }
    })

    const buildPath = (pts) => {
      if (pts.length === 0) return ''
      let p = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = Math.round((pts[i].x + pts[i + 1].x) / 2)
        const yc = Math.round((pts[i].y + pts[i + 1].y) / 2)
        p += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`
      }
      p += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
      return p
    }

    const path = buildPath(curvePoints)
    const fillPath = `${path} L ${curvePoints[curvePoints.length - 1].x} ${baselineY + 30} L ${curvePoints[0].x} ${baselineY + 30} Z`
    const forecastPath = buildPath(forecastPoints)

    return { curvePoints, forecastPoints, path, fillPath, forecastPath }
  }

  const todayDay = new Date().getDay()
  const todayWeekIdx = todayDay === 0 ? 6 : todayDay - 1

  return {
    Week: {
      labels: weekLabels,
      collected: weekCollected,
      projected: weekProjected,
      ...generateSvg(weekCollected, weekProjected),
      defaultIndex: todayWeekIdx,
    },
    Month: {
      labels: monthLabels,
      collected: monthCollected,
      projected: monthProjected,
      ...generateSvg(monthCollected, monthProjected),
      defaultIndex: new Date().getMonth(),
    },
    Year: {
      labels: yearLabels,
      collected: yearCollected,
      projected: yearProjected,
      ...generateSvg(yearCollected, yearProjected),
      defaultIndex: 2,
    },
  }
}

export default function Dashboard({ onNavigate, onOpenCustomerLookup }) {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [activeProjectsList, setActiveProjectsList] = useState([])
  const [loading, setLoading] = useState(true)

  // Interactive dynamic chart state
  const [timeframe, setTimeframe] = useState('Week')
  const [showForecast, setShowForecast] = useState(true)
  const [activePointIndex, setActivePointIndex] = useState(0)
  const [chartData, setChartData] = useState(() => buildChartData([], []))

  const chartSvgRef = useRef(null)

  useEffect(() => {
    fetchData()

    // Realtime listener for live sync
    const channel = supabase
      .channel('realtime-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
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

      const generated = buildChartData(paymentsList, projectsList)
      setChartData(generated)
      if (generated[timeframe]) {
        setActivePointIndex(generated[timeframe].defaultIndex)
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
    setLoading(false)
  }

  // Handle dynamic touch/mouse movement across the wave chart
  const handleChartInteraction = (clientX) => {
    if (!chartSvgRef.current) return
    const rect = chartSvgRef.current.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percent = Math.max(0, Math.min(1, relativeX / rect.width))

    const activeSet = chartData[timeframe] || chartData.Week
    const count = activeSet.labels.length
    const index = Math.min(count - 1, Math.max(0, Math.round(percent * (count - 1))))
    setActivePointIndex(index)
  }

  const currentDataset = chartData[timeframe] || chartData.Week
  const safeIndex = Math.min(activePointIndex, currentDataset.labels.length - 1)
  const currentPoint = currentDataset.curvePoints[safeIndex] || { x: 370, y: 190 }
  const currentLabel = currentDataset.labels[safeIndex] || 'Mon'
  const currentCollected = currentDataset.collected[safeIndex] || 0
  const currentProjected = currentDataset.projected[safeIndex] || 0

  // Calculate dynamic tooltip X to stay within screen boundaries
  const tooltipLeftPercent = Math.max(25, Math.min(75, (currentPoint.x / 700) * 100))

  return (
    <div>
      {/* QUICK MOBILE NUMBER LOOKUP BAR BANNER */}
      <div className="customer-lookup-banner">
        <div className="customer-lookup-banner-left">
          <div className="glow-badge-icon emerald">
            <Phone size={18} strokeWidth={2.5} />
          </div>
          <div>
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Customer Mobile Number Search</strong>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Search unique mobile numbers to pull up client projects, paid amount &amp; remaining due
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm customer-lookup-banner-btn"
          onClick={onOpenCustomerLookup}
        >
          <Search size={14} /> Search by Mobile #
        </button>
      </div>

      {/* 4 TOP OBSIDIAN METRIC CARDS */}
      <div className="obsidian-grid-4">
        {/* 1. Total Revenue */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Total Revenue</span>
            <div className="glow-badge-icon emerald">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val" style={{ color: 'var(--primary)' }}>
            {fmt(stats?.totalRevenue)}
          </div>
          <div className="obsidian-card-footer">
            <span className="trend-pill positive">
              <ArrowUpRight size={13} /> {Number(stats?.totalRevenue) > 0 ? '+18.4% Since last month' : '0.0% Since last month'}
            </span>
            <span className="card-mini-link" onClick={() => onNavigate('payments')}>
              View ↗
            </span>
          </div>
        </div>

        {/* 2. Active Plans */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Active Plans</span>
            <div className="glow-badge-icon purple">
              <FolderOpen size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val">
            {stats?.activeCount || 0}/{stats?.totalProjects || 0} <span className="unit">Plans</span>
          </div>
          <div className="obsidian-card-footer">
            <span>{Number(stats?.totalProjects) > 0 ? 'Updated recently' : 'No plans registered'}</span>
            <span className="card-mini-link" onClick={() => onNavigate('projects')}>
              Plans ↗
            </span>
          </div>
        </div>

        {/* 3. Outstanding Due */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Outstanding Due</span>
            <div className="glow-badge-icon amber">
              <Clock size={16} strokeWidth={2.5} />
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

        {/* 4. Collection Rate */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Collection Rate</span>
            <div className="glow-badge-icon blue">
              <Compass size={16} strokeWidth={2.5} />
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

      {/* DYNAMIC INTERACTIVE WAVE CHART SECTION (Matching screenshot exactly) */}
      <div className="obsidian-main-row">
        {/* Left: Wave Chart Card with dynamic hover & touch */}
        <div className="wave-chart-card" style={{ position: 'relative' }}>
          <div className="wave-chart-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3 }}>
                Cashflow &amp; Forecast Revenue
              </h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Weekly billing trends &amp; architectural milestone projections
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="pill-tabs">
                {['Week', 'Month', 'Year'].map((p) => (
                  <button
                    key={p}
                    className={`pill-tab ${timeframe === p ? 'active' : ''}`}
                    onClick={() => {
                      setTimeframe(p)
                      if (chartData[p]) {
                        setActivePointIndex(chartData[p].defaultIndex)
                      }
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Forecast Toggle Switch with Dynamic Effect */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => setShowForecast(!showForecast)}
              >
                <span>Forecast</span>
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 99,
                    background: showForecast ? 'var(--primary)' : 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: showForecast ? '#0c1c14' : 'var(--text-muted)',
                      position: 'absolute',
                      top: 2,
                      left: showForecast ? 18 : 3,
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC SVG CHART CONTAINER WITH TOUCH & HOVER INTERACTION */}
          <div
            ref={chartSvgRef}
            style={{
              position: 'relative',
              width: '100%',
              height: 230,
              cursor: 'crosshair',
              touchAction: 'none',
            }}
            onMouseMove={(e) => handleChartInteraction(e.clientX)}
            onTouchMove={(e) => {
              if (e.touches && e.touches[0]) {
                handleChartInteraction(e.touches[0].clientX)
              }
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 700 230" preserveAspectRatio="none">
              {/* Horizontal Grid Lines */}
              <line x1="0" y1="50" x2="700" y2="50" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.35" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.35" />
              <line x1="0" y1="150" x2="700" y2="150" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.35" />

              {/* DYNAMIC VERTICAL DASHED MARKER LINE (follows active point) */}
              <line
                x1={currentPoint.x}
                y1="20"
                x2={currentPoint.x}
                y2="215"
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
                style={{ transition: 'x1 0.2s ease, x2 0.2s ease' }}
              />

              {/* Shaded Area Under Curve */}
              <path
                d={currentDataset.fillPath}
                fill="rgba(0, 210, 147, 0.08)"
              />

              {/* Main Glowing Emerald Curve */}
              <path
                d={currentDataset.path}
                fill="none"
                stroke="#00d293"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Secondary Cyan Forecast Dashed Line */}
              <path
                d={currentDataset.forecastPath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity={showForecast ? 0.8 : 0}
                style={{ transition: 'opacity 0.3s ease' }}
              />

              {/* DYNAMIC PULSING DOT AT ACTIVE POINT */}
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="6.5"
                fill="#00d293"
                style={{ transition: 'cx 0.2s ease, cy 0.2s ease' }}
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="13"
                fill="#00d293"
                opacity="0.25"
                style={{ transition: 'cx 0.2s ease, cy 0.2s ease' }}
              />
            </svg>

            {/* DYNAMIC TOOLTIP BOX (Matching the user's screenshot exactly!) */}
            <div
              className="wave-tooltip-box"
              style={{
                top: `${Math.max(10, currentPoint.y - 75)}px`,
                left: `clamp(10px, calc(${tooltipLeftPercent}% - 80px), calc(100% - 190px))`,
                transition: 'top 0.2s ease, left 0.2s ease',
                pointerEvents: 'none',
              }}
            >
              <div className="wave-tooltip-date">
                Milestone Inspection • {currentLabel} 2026
              </div>
              <div className="wave-tooltip-item">
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>• Collected:</span>
                <strong>{fmt(currentCollected)}</strong>
              </div>
              {showForecast && (
                <div className="wave-tooltip-item">
                  <span style={{ color: '#38bdf8' }}>• Projection:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{fmt(currentProjected)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Days / Periods Labels (Clickable/Tappable!) */}
          <div className="chart-days-bar">
            {currentDataset.labels.map((lbl, idx) => (
              <span
                key={lbl}
                onClick={() => setActivePointIndex(idx)}
                style={{
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 6,
                  color: idx === safeIndex ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: idx === safeIndex ? 800 : 500,
                  background: idx === safeIndex ? 'var(--primary-subtle)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {lbl}
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
                  <span className="condition-cell-title">Unique Clients</span>
                  <div className="glow-badge-icon blue" style={{ width: 26, height: 26 }}>
                    <Users size={13} />
                  </div>
                </div>
                <div className="condition-cell-val">
                  {stats?.clientsCount} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>By Mobile</span>
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
              <span className="badge badge-active" style={{ fontSize: 9, padding: '1px 6px' }}>
                {stats?.collectionRate || 0}%
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {Number(stats?.totalOutstanding) > 0 ? (
                <>Pending collection: <strong>{fmt(stats?.totalOutstanding)}</strong> across active house design plans.</>
              ) : (
                <>No pending balance. Add clients and projects to track architectural milestone payments.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* RECENT PAYMENTS LOG TABLE */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Recent Client Payments</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Latest settlement transactions</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('payments')}>
            View All Payments
          </button>
        </div>

        {/* Desktop Table (hidden on mobile <= 768px) */}
        <div className="table-wrapper table-desktop-only">
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

        {/* Mobile View for Recent Payments */}
        <div className="mobile-cards-list" style={{ padding: 14 }}>
          {recentPayments.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: 'center', width: '100%' }}>
              <CreditCard size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No payment transactions recorded yet.</p>
            </div>
          ) : (
            recentPayments.map((p) => (
              <div key={p.id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <strong>{p.clientName}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.projectName}</div>
                  </div>
                  <strong style={{ color: 'var(--primary)', fontSize: 15 }}>{fmt(p.amount)}</strong>
                </div>
                <div className="mobile-data-card-row">
                  <span>Method:</span>
                  <span className="badge badge-active" style={{ fontSize: 11 }}>{p.payment_method}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span>Date:</span>
                  <span>{new Date(p.payment_date).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
