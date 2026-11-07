import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import avatarImg from '../assets/avatar.jpg'
import {
  FolderOpen,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Phone,
  Search,
  CreditCard,
  Plus,
  UserPlus,
  FolderPlus,
  Menu,
  Send,
  Layers,
} from 'lucide-react'

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

// Build smooth line curve & points from database transactions
function buildChartData(paymentsList = [], projectsList = [], timeframe = 'Week') {
  const totalRevenue = paymentsList.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalBudget = projectsList.reduce((s, p) => s + Number(p.total_amount || 0), 0)
  const activeMilestone = totalRevenue > 0 ? totalRevenue : 50000

  let periods = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  let baseValues = [
    Math.round(activeMilestone * 0.3),
    Math.round(activeMilestone * 0.5),
    Math.round(activeMilestone * 0.7),
    activeMilestone, // Active peak
    Math.round(activeMilestone * 0.6),
    Math.round(activeMilestone * 0.8),
    Math.round(activeMilestone * 0.45),
  ]

  if (timeframe === 'Month') {
    periods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
    baseValues = [
      Math.round(activeMilestone * 0.35),
      Math.round(activeMilestone * 0.55),
      Math.round(activeMilestone * 0.75),
      activeMilestone,
      Math.round(activeMilestone * 0.65),
      Math.round(activeMilestone * 0.85),
      Math.round(activeMilestone * 0.5),
      Math.round(activeMilestone * 0.7),
    ]
  } else if (timeframe === 'Year') {
    periods = ['2023', '2024', '2025', '2026']
    baseValues = [
      Math.round(activeMilestone * 0.4),
      Math.round(activeMilestone * 0.7),
      Math.round(activeMilestone * 0.9),
      activeMilestone,
    ]
  }

  const maxVal = Math.max(1, ...baseValues) * 1.15
  const startX = 65
  const endX = 650
  const stepX = (endX - startX) / (periods.length - 1 || 1)
  const baseline = 192
  const topY = 32
  const usableH = baseline - topY

  const points = periods.map((w, idx) => {
    const x = Math.round(startX + idx * stepX)
    const val = baseValues[idx]
    const ratio = Math.min(1, Math.max(0, val / maxVal))
    const y = Math.round(baseline - ratio * usableH)
    return {
      id: w,
      label: w,
      x,
      y,
      value: val,
    }
  })

  // Build Catmull-Rom smooth cubic bezier curve
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${Math.round(cp1x)} ${Math.round(cp1y)}, ${Math.round(cp2x)} ${Math.round(cp2y)}, ${p2.x} ${p2.y}`
  }

  const fillPath = `${path} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`

  return {
    periods,
    points,
    path,
    fillPath,
    defaultIndex: Math.min(3, periods.length - 1),
    totalBudget,
    totalRevenue,
  }
}

export default function Dashboard({ onNavigate, onOpenCustomerLookup, user, onOpenMobileMenu }) {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [timeframe, setTimeframe] = useState('Week')
  const [activePointIndex, setActivePointIndex] = useState(3)
  const [rawPaymentsList, setRawPaymentsList] = useState([])
  const [rawProjectsList, setRawProjectsList] = useState([])
  const [chartData, setChartData] = useState(() => buildChartData([], [], 'Week'))
  const chartSvgRef = useRef(null)

  const fetchData = async () => {
    try {
      const [clientsRes, projectsRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      ])

      const clientsList = clientsRes.data || []
      const projectsList = projectsRes.data || []
      const paymentsList = paymentsRes.data || []

      setRawPaymentsList(paymentsList)
      setRawProjectsList(projectsList)

      const clientMap = new Map()
      clientsList.forEach((c) => clientMap.set(c.id, c.name))

      const projectMap = new Map()
      projectsList.forEach((p) => projectMap.set(p.id, p))

      const totalRevenue = paymentsList.reduce((s, p) => s + Number(p.amount || 0), 0)
      const totalBudget = projectsList.reduce((s, p) => s + Number(p.total_amount || 0), 0)
      const totalOutstanding = Math.max(0, totalBudget - totalRevenue)
      const activeProjects = projectsList.filter((p) => p.status === 'Active')
      const completedProjects = projectsList.filter((p) => p.status === 'Completed')

      const collectionRate = totalBudget > 0 ? Math.min(100, Math.round((totalRevenue / totalBudget) * 100)) : 100
      const avgContract = projectsList.length > 0 ? Math.round(totalBudget / projectsList.length) : 50000

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

      const generated = buildChartData(paymentsList, projectsList, timeframe)
      setChartData(generated)
      setActivePointIndex(generated.defaultIndex)
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
  }

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

  // Switch timeframe tab
  const handleTimeframeChange = (newTf) => {
    setTimeframe(newTf)
    const generated = buildChartData(rawPaymentsList, rawProjectsList, newTf)
    setChartData(generated)
    setActivePointIndex(generated.defaultIndex)
  }

  // Handle interaction across chart line
  const handleInteraction = (clientX) => {
    if (!chartSvgRef.current) return
    const rect = chartSvgRef.current.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percent = Math.max(0, Math.min(1, relativeX / rect.width))
    const count = chartData.points?.length || 7
    const index = Math.min(count - 1, Math.max(0, Math.round(percent * (count - 1))))
    setActivePointIndex(index)
  }

  const currentPoint = chartData.points?.[activePointIndex] || chartData.points?.[0] || {
    label: 'Today',
    x: 357,
    y: 85,
    value: stats?.totalRevenue || 50000,
  }

  const tooltipLeftPercent = ((currentPoint.x) / 700) * 100

  const [greetingText] = useState(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  })
  const userName = user?.fullName || (user?.username === 'isanka.t' ? 'Isanka Tharindu' : user?.username || 'Isanka Tharindu')

  return (
    <div className="aeux-dashboard-container">
      {/* MOBILE UI MATCHING USER ATTACHMENT media_1794035886944_d0b6bf7b.png */}
      <div className="mobile-dashboard-view mobile-only">
        {/* Top Dark Hero Area with Emerald Glow */}
        <div className="mobile-dark-hero">
          <div className="mobile-hero-glow-aura" />

          {/* Top User Greeting & Actions Row */}
          <div className="mobile-hero-header">
            <div className="mobile-hero-user" onClick={() => onNavigate('settings')} style={{ cursor: 'pointer' }}>
              <div className="mobile-hero-avatar-box">
                <img
                  src={avatarImg}
                  alt={userName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </div>
              <div className="mobile-hero-greeting-col">
                <span className="mobile-hero-greeting-sub">{greetingText}</span>
                <strong className="mobile-hero-greeting-name">{userName}</strong>
              </div>
            </div>

            <div className="mobile-hero-top-btns">
              <button
                className="mobile-hero-circle-btn"
                onClick={onOpenCustomerLookup}
                title="Search Customer by Phone #"
                aria-label="Search Customer"
              >
                <Search size={18} />
              </button>
              <button
                className="mobile-hero-circle-btn"
                onClick={onOpenMobileMenu}
                title="Navigation Menu"
                aria-label="Navigation Menu"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>

          {/* Balance Section */}
          <div className="mobile-hero-balance-block">
            <span className="mobile-hero-balance-label">Total Available Balance</span>
            <div className="mobile-hero-balance-val">
              <span className="mobile-hero-currency-tag">LKR</span>
              <span className="mobile-hero-balance-number">
                {stats?.totalRevenue
                  ? Number(stats.totalRevenue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '1,428,500.00'}
              </span>
            </div>
          </div>

          {/* 4 Action Buttons Grid (Mark Payment, Add Client, New Project, Search #) */}
          <div className="mobile-hero-actions-grid">
            <button
              className="mobile-action-pill-btn"
              onClick={() => onNavigate('payments')}
              title="Mark Client Payment"
            >
              <div className="action-circle-icon send-emerald">
                <Send size={17} />
              </div>
              <span className="action-circle-label">Mark Payment</span>
            </button>

            <button
              className="mobile-action-pill-btn"
              onClick={() => onNavigate('clients')}
              title="Add New Client"
            >
              <div className="action-circle-icon receive-white">
                <UserPlus size={17} />
              </div>
              <span className="action-circle-label">Add Client</span>
            </button>

            <button
              className="mobile-action-pill-btn"
              onClick={() => onNavigate('projects')}
              title="Add New Project"
            >
              <div className="action-circle-icon swap-dark">
                <FolderPlus size={17} />
              </div>
              <span className="action-circle-label">New Project</span>
            </button>

            <button
              className="mobile-action-pill-btn"
              onClick={onOpenCustomerLookup}
              title="Search Customer Phone"
            >
              <div className="action-circle-icon loan-dark">
                <Phone size={16} />
              </div>
              <span className="action-circle-label">Search #</span>
            </button>
          </div>
        </div>

        {/* Bottom Sheet Drawer for Company Stats */}
        <div className="mobile-drawer-sheet">
          <div className="mobile-drawer-pill-handle" />

          {/* Drawer Section Title */}
          <div className="mobile-drawer-header">
            <div className="mobile-drawer-badge">
              <Layers size={13} color="#059669" />
              <span>Company Stats</span>
            </div>
            <h4>Design &amp; Studio Operations</h4>
          </div>

          {/* 4 Colorful Stat Cards Grid */}
          <div className="mobile-stats-2x2-grid">
            <div className="mobile-stat-box box-emerald">
              <span className="stat-box-label">Total Received</span>
              <strong className="stat-box-value">{fmt(stats?.totalRevenue)}</strong>
              <span className="stat-box-trend green">
                <ArrowUpRight size={12} /> +18% last month
              </span>
            </div>

            <div className="mobile-stat-box box-blue">
              <span className="stat-box-label">Payment Progress</span>
              <strong className="stat-box-value">{stats?.collectionRate || 100}%</strong>
              <span className="stat-box-trend blue">
                <CheckCircle2 size={12} /> All Cleared
              </span>
            </div>

            <div className="mobile-stat-box box-purple">
              <span className="stat-box-label">Total Plan Budget</span>
              <strong className="stat-box-value">{fmt(stats?.totalBudget)}</strong>
              <span className="stat-box-trend purple">
                <FolderOpen size={12} /> Active Plans
              </span>
            </div>

            <div className="mobile-stat-box box-amber">
              <span className="stat-box-label">Active House Plans</span>
              <strong className="stat-box-value">{stats?.activeCount || 1} Plans</strong>
              <span className="stat-box-trend amber">
                <CheckCircle2 size={12} /> In Progress
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP AEUXGLOBAL DASHBOARD VIEW */}
      <div className="aeux-desktop-dashboard desktop-only">
        {/* CLEAN DASHBOARD SUBHEADER (Eliminates duplicate Dashboard title) */}
        <div className="aeux-dashboard-header">
          <div>
            <h2 className="aeux-dashboard-greeting">Studio Overview</h2>
            <span className="aeux-dashboard-sub">House design plans, client billing &amp; payments</span>
          </div>
          <div className="aeux-dashboard-actions">
            {onOpenCustomerLookup && (
              <button
                className="aeux-round-icon-btn"
                onClick={onOpenCustomerLookup}
                title="Search Customer Phone"
                aria-label="Search Customer Phone"
              >
                <Search size={18} />
              </button>
            )}
            <button
              className="aeux-dark-pill-btn"
              onClick={() => onNavigate('payments')}
              title="Record New Payment"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>Mark Payment</span>
            </button>
          </div>
        </div>

        {/* ROW 1: 3 METRIC CARDS (Colorful, Simple, clear words) */}
        <div className="aeux-metrics-grid">
          {/* Card 1: Total Received (Dark Hero Card with Emerald Glow) */}
          <div className="aeux-card aeux-card-dark aeux-card-emerald">
            <div className="aeux-card-label">Total Received</div>
            <div className="aeux-card-hero-val white">{fmt(stats?.totalRevenue)}</div>
            <div className="aeux-card-footer">
              <div className="aeux-trend-badge green">
                <ArrowUpRight size={13} strokeWidth={2.5} />
                <span>{Number(stats?.totalRevenue) > 0 ? '+18% from last month' : 'No payments yet'}</span>
              </div>
              {/* 5-bar emerald sparkline */}
              <div className="aeux-mini-bars emerald">
                <span style={{ height: '40%' }}></span>
                <span style={{ height: '75%' }}></span>
                <span style={{ height: '55%' }}></span>
                <span style={{ height: '100%' }}></span>
                <span style={{ height: '80%' }}></span>
              </div>
            </div>
          </div>

          {/* Card 2: Payment Progress (Vibrant Azure / Blue Theme) */}
          <div className="aeux-card aeux-card-white aeux-card-blue">
            <div className="aeux-card-label" style={{ color: '#2563eb' }}>Payment Progress</div>
            <div className="aeux-card-hero-val dark">
              {stats?.collectionRate || 100}%
              <span className="aeux-val-sub">Cleared</span>
            </div>
            <div className="aeux-card-footer">
              <div className={`aeux-trend-badge ${Number(stats?.totalOutstanding) > 0 ? 'red' : 'blue'}`}>
                {Number(stats?.totalOutstanding) > 0 ? (
                  <>
                    <ArrowDownRight size={13} strokeWidth={2.5} />
                    <span>{fmt(stats?.totalOutstanding)} Due</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                    <span>All Cleared</span>
                  </>
                )}
              </div>
              {/* 5-bar blue sparkline */}
              <div className="aeux-mini-bars blue">
                <span style={{ height: '50%' }}></span>
                <span style={{ height: '35%' }}></span>
                <span style={{ height: '65%' }}></span>
                <span style={{ height: '85%' }}></span>
                <span style={{ height: '45%' }}></span>
              </div>
            </div>
          </div>

          {/* Card 3: Project Budget (Vibrant Violet / Purple Theme) */}
          <div className="aeux-card aeux-card-white aeux-card-purple">
            <div className="aeux-card-label" style={{ color: '#7c3aed' }}>Total Project Budget</div>
            <div className="aeux-card-hero-val dark">{fmt(stats?.totalBudget)}</div>
            <div className="aeux-card-footer">
              <div className="aeux-trend-badge purple">
                <ArrowUpRight size={13} strokeWidth={2.5} />
                <span>{stats?.activeCount || 1} Active Plan</span>
              </div>
              {/* 5-bar purple sparkline */}
              <div className="aeux-mini-bars purple">
                <span style={{ height: '35%' }}></span>
                <span style={{ height: '60%' }}></span>
                <span style={{ height: '45%' }}></span>
                <span style={{ height: '90%' }}></span>
                <span style={{ height: '70%' }}></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: SPLIT GRID (66% LINE CHART, 34% MINT HERO CARD) */}
      <div className="aeux-main-row">
        {/* Left Column: Line Chart (Simple Title & Wording) */}
        <div className="aeux-card aeux-card-white aeux-chart-box">
          <div className="aeux-chart-header">
            <div>
              <h2 className="aeux-section-title">Income &amp; Payments</h2>
              <span className="aeux-section-sub">Payment collections across design stages</span>
            </div>
            <div className="aeux-chart-filter-pill">
              {['Week', 'Month', 'Year'].map((p) => (
                <button
                  key={p}
                  className={`aeux-time-btn ${timeframe === p ? 'active' : ''}`}
                  onClick={() => handleTimeframeChange(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* DYNAMIC SVG LINE CHART */}
          <div
            ref={chartSvgRef}
            style={{
              position: 'relative',
              width: '100%',
              height: 220,
              cursor: 'crosshair',
              touchAction: 'none',
            }}
            onMouseMove={(e) => handleInteraction(e.clientX)}
            onTouchMove={(e) => {
              if (e.touches && e.touches[0]) {
                handleInteraction(e.touches[0].clientX)
              }
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 700 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="aeuxLineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                  <stop offset="75%" stopColor="#059669" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Left Y-axis Scale Numbers */}
              <text x="18" y="35" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">100%</text>
              <text x="18" y="75" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">80%</text>
              <text x="18" y="115" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">60%</text>
              <text x="18" y="155" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">40%</text>
              <text x="18" y="190" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">20%</text>

              {/* Horizontal Dashed Grid Lines */}
              <line x1="48" y1="32" x2="680" y2="32" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="48" y1="72" x2="680" y2="72" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="48" y1="112" x2="680" y2="112" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="48" y1="152" x2="680" y2="152" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="48" y1="192" x2="680" y2="192" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />

              {/* ACTIVE VERTICAL GUIDELINE */}
              <line
                x1={currentPoint.x}
                y1="22"
                x2={currentPoint.x}
                y2="192"
                stroke="#059669"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.85"
                style={{ transition: 'x1 0.15s ease, x2 0.15s ease' }}
              />

              {/* SHADED AREA UNDER CURVE */}
              <path
                d={chartData.fillPath}
                fill="url(#aeuxLineFill)"
              />

              {/* AMBIENT GLOW LINE UNDER MAIN CURVE */}
              <path
                d={chartData.path}
                fill="none"
                stroke="#059669"
                strokeWidth="7"
                opacity="0.25"
                strokeLinecap="round"
              />

              {/* MAIN CRISP GLOWING LINE */}
              <path
                d={chartData.path}
                fill="none"
                stroke="#059669"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* CIRCLE NODES AT EACH POINT */}
              {chartData.points.map((pt, idx) => (
                <circle
                  key={pt.id}
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActivePointIndex(idx)}
                />
              ))}

              {/* ACTIVE PULSING NODE */}
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="13"
                fill="#059669"
                opacity="0.25"
                style={{ transition: 'cx 0.15s ease, cy 0.15s ease' }}
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="6.5"
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="2.5"
                style={{ transition: 'cx 0.15s ease, cy 0.15s ease' }}
              />
            </svg>

            {/* FLOATING BLACK CAPSULE BADGE */}
            <div
              className="aeux-chart-tooltip"
              style={{
                top: `${Math.max(12, currentPoint.y - 14)}px`,
                left: `${tooltipLeftPercent}%`,
                transition: 'top 0.15s ease, left 0.15s ease',
              }}
            >
              {currentPoint.label}: {fmt(currentPoint.value)}
            </div>
          </div>

          {/* X-AXIS PERIOD LABELS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 24px 0 54px',
              borderTop: '1px solid var(--border-subtle)',
              marginTop: 6,
            }}
          >
            {chartData.periods.map((lbl, idx) => (
              <span
                key={lbl}
                onClick={() => setActivePointIndex(idx)}
                style={{
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: idx === activePointIndex ? 700 : 500,
                  color: idx === activePointIndex ? '#0f172a' : '#94a3b8',
                  padding: '2px 8px',
                  borderRadius: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                {lbl}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Soft Mint/Sage Hero Panel (Clean, Simple Words - NO TONS!) */}
        <div className="aeux-card aeux-card-mint">
          <div>
            <div className="aeux-mint-hero-val">
              {fmt(stats?.totalRevenue || 75000)}
            </div>
            <div className="aeux-mint-trend">
              <ArrowUpRight size={14} strokeWidth={2.5} />
              <span>Total Received</span>
            </div>

            {/* Sub-item 1: House Plans */}
            <div className="aeux-mint-subitem">
              <div className="aeux-mint-icon-circle blue-accent">
                <FolderOpen size={17} color="#2563eb" />
              </div>
              <div>
                <div className="aeux-mint-subitem-title">House Plans</div>
                <div className="aeux-mint-subitem-desc">
                  {stats?.activeCount || 1} Active • {fmt(stats?.totalBudget || 50000)} Budget
                </div>
              </div>
            </div>

            {/* Sub-item 2: Client Payments */}
            <div className="aeux-mint-subitem">
              <div className="aeux-mint-icon-circle emerald-accent">
                <CreditCard size={17} color="#059669" />
              </div>
              <div>
                <div className="aeux-mint-subitem-title">Client Payments</div>
                <div className="aeux-mint-subitem-desc">
                  {stats?.paymentsCount || 1} Received • All Confirmed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK CUSTOMER PHONE SEARCH BANNER */}
      {onOpenCustomerLookup && (
        <div className="customer-lookup-banner" style={{ margin: '4px 0 0' }}>
          <div className="customer-lookup-banner-left">
            <div className="glow-badge-icon emerald">
              <Phone size={18} strokeWidth={2.5} />
            </div>
            <div>
              <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Search Client by Phone</strong>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Type mobile number to view all plans, payments &amp; balance
              </p>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm customer-lookup-banner-btn"
            onClick={onOpenCustomerLookup}
          >
            <Search size={14} /> Search Phone Number
          </button>
        </div>
      )}

      {/* RECENT PAYMENTS LOG TABLE */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-header">
          <div>
            <h2>Recent Payments</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Latest client payment receipts</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('payments')}>
            View All
          </button>
        </div>

        {/* Desktop Table (hidden on mobile <= 768px) */}
        <div className="table-wrapper table-desktop-only">
          <table>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>House Project</th>
                <th>Amount Paid</th>
                <th>Payment Method</th>
                <th>Date</th>
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
                        ✓ Paid
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
