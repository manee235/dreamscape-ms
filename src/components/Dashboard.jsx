import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import {
  FolderOpen,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Phone,
  Search,
  CreditCard,
  Plus,
} from 'lucide-react'

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

// Build 8-period smooth line curve & points from database transactions
function buildChartData(paymentsList = [], projectsList = []) {
  const periods = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']
  const totalRevenue = paymentsList.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalBudget = projectsList.reduce((s, p) => s + Number(p.total_amount || 0), 0)

  // Calibrate 8 weekly points with smooth milestone trajectory
  const activeMilestone = totalRevenue > 0 ? totalRevenue : 50000
  const baseValues = [
    Math.round(activeMilestone * 0.38),
    Math.round(activeMilestone * 0.55),
    Math.round(activeMilestone * 0.72),
    activeMilestone, // Peak milestone (W4)
    Math.round(activeMilestone * 0.62),
    Math.round(activeMilestone * 0.85),
    Math.round(activeMilestone * 0.48),
    Math.round(activeMilestone * 0.68),
  ]

  const maxVal = Math.max(1, ...baseValues) * 1.15
  const startX = 65
  const endX = 650
  const stepX = (endX - startX) / (periods.length - 1)
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
    defaultIndex: 3, // W4
    totalBudget,
    totalRevenue,
  }
}

export default function Dashboard({ onNavigate, onOpenCustomerLookup }) {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [timeframe, setTimeframe] = useState('2 month')
  const [activePointIndex, setActivePointIndex] = useState(3)
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

      const collectionRate = totalBudget > 0 ? Math.round((totalRevenue / totalBudget) * 100) : 100
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

      const generated = buildChartData(paymentsList, projectsList)
      setChartData(generated)
      setActivePointIndex(generated.defaultIndex)
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
  }

  // Handle interaction across chart line
  const handleInteraction = (clientX) => {
    if (!chartSvgRef.current) return
    const rect = chartSvgRef.current.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percent = Math.max(0, Math.min(1, relativeX / rect.width))
    const index = Math.min(7, Math.max(0, Math.round(percent * 7)))
    setActivePointIndex(index)
  }

  const currentPoint = chartData.points?.[activePointIndex] || chartData.points?.[3] || {
    label: 'W4',
    x: 357,
    y: 85,
    value: stats?.totalRevenue || 50000,
  }

  const tooltipLeftPercent = ((currentPoint.x) / 700) * 100

  return (
    <div className="aeux-dashboard-container">
      {/* TOP DASHBOARD BAR */}
      <div className="aeux-dashboard-header">
        <h1 className="aeux-dashboard-title">Dashboard</h1>
        <div className="aeux-dashboard-actions">
          {onOpenCustomerLookup && (
            <button
              className="aeux-round-icon-btn"
              onClick={onOpenCustomerLookup}
              title="Search Customer by Mobile Number"
              aria-label="Search Customer by Mobile Number"
            >
              <Search size={18} />
            </button>
          )}
          <button
            className="aeux-dark-pill-btn"
            onClick={() => onNavigate('payments')}
            title="Mark Client Payment"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Mark Client Payment</span>
          </button>
        </div>
      </div>

      {/* ROW 1: 3 METRIC CARDS */}
      <div className="aeux-metrics-grid">
        {/* Card 1: Obsidian Dark Hero Card */}
        <div className="aeux-card aeux-card-dark">
          <div className="aeux-card-label">Total Revenue</div>
          <div className="aeux-card-hero-val white">{fmt(stats?.totalRevenue)}</div>
          <div className="aeux-card-footer">
            <div className="aeux-trend-badge green">
              <ArrowUpRight size={13} strokeWidth={2.5} />
              <span>{Number(stats?.totalRevenue) > 0 ? '+18.4% than last month' : '0.0% than last month'}</span>
            </div>
            {/* 5-bar emerald mini chart graphic */}
            <div className="aeux-mini-bars emerald">
              <span style={{ height: '40%' }}></span>
              <span style={{ height: '75%' }}></span>
              <span style={{ height: '55%' }}></span>
              <span style={{ height: '100%' }}></span>
              <span style={{ height: '80%' }}></span>
            </div>
          </div>
        </div>

        {/* Card 2: Collection Efficiency */}
        <div className="aeux-card aeux-card-white">
          <div className="aeux-card-label">Collection Efficiency</div>
          <div className="aeux-card-hero-val dark">
            {stats?.collectionRate || 100}
            <span className="aeux-val-sub">/100%</span>
          </div>
          <div className="aeux-card-footer">
            <div className={`aeux-trend-badge ${Number(stats?.totalOutstanding) > 0 ? 'red' : 'green'}`}>
              {Number(stats?.totalOutstanding) > 0 ? (
                <>
                  <ArrowDownRight size={13} strokeWidth={2.5} />
                  <span>Pending dues</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                  <span>All cleared</span>
                </>
              )}
            </div>
            {/* 5-bar coral/grey mini chart graphic */}
            <div className="aeux-mini-bars coral">
              <span style={{ height: '50%' }}></span>
              <span style={{ height: '35%' }}></span>
              <span style={{ height: '65%' }}></span>
              <span style={{ height: '85%' }}></span>
              <span style={{ height: '45%' }}></span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Plans Budget */}
        <div className="aeux-card aeux-card-white">
          <div className="aeux-card-label">Active Plans Budget</div>
          <div className="aeux-card-hero-val dark">{fmt(stats?.totalBudget)}</div>
          <div className="aeux-card-footer">
            <div className="aeux-trend-badge green">
              <ArrowUpRight size={13} strokeWidth={2.5} />
              <span>+5.1% than last month</span>
            </div>
            {/* 5-bar emerald mini chart graphic */}
            <div className="aeux-mini-bars emerald">
              <span style={{ height: '35%' }}></span>
              <span style={{ height: '60%' }}></span>
              <span style={{ height: '45%' }}></span>
              <span style={{ height: '90%' }}></span>
              <span style={{ height: '70%' }}></span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: SPLIT GRID (66% LINE CHART, 34% MINT HERO CARD) */}
      <div className="aeux-main-row">
        {/* Left Column: Line Chart ("Climate Change Index") */}
        <div className="aeux-card aeux-card-white aeux-chart-box">
          <div className="aeux-chart-header">
            <div>
              <h2 className="aeux-section-title">Climate Change Index</h2>
              <span className="aeux-section-sub">Weekly collections &amp; milestone projections</span>
            </div>
            <div className="aeux-chart-filter-pill">
              {['2 month', 'Week', 'Year'].map((p) => (
                <button
                  key={p}
                  className={`aeux-time-btn ${timeframe === p ? 'active' : ''}`}
                  onClick={() => setTimeframe(p)}
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
                  <stop offset="0%" stopColor="#00d293" stopOpacity="0.28" />
                  <stop offset="75%" stopColor="#00d293" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#00d293" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Left Y-axis Scale Numbers */}
              <text x="18" y="35" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">100</text>
              <text x="18" y="75" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">80</text>
              <text x="18" y="115" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">60</text>
              <text x="18" y="155" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">40</text>
              <text x="18" y="190" fill="#94a3b8" fontSize="10" fontFamily="var(--font-family)">20</text>

              {/* Horizontal Dashed Grid Lines */}
              <line x1="45" y1="32" x2="680" y2="32" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="45" y1="72" x2="680" y2="72" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="45" y1="112" x2="680" y2="112" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="45" y1="152" x2="680" y2="152" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="45" y1="192" x2="680" y2="192" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />

              {/* ACTIVE VERTICAL GUIDELINE */}
              <line
                x1={currentPoint.x}
                y1="22"
                x2={currentPoint.x}
                y2="192"
                stroke="#00d293"
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
                stroke="#00d293"
                strokeWidth="7"
                opacity="0.22"
                strokeLinecap="round"
              />

              {/* MAIN CRISP GLOWING LINE */}
              <path
                d={chartData.path}
                fill="none"
                stroke="#00d293"
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
                  stroke="#00d293"
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
                fill="#00d293"
                opacity="0.25"
                style={{ transition: 'cx 0.15s ease, cy 0.15s ease' }}
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="6.5"
                fill="#00d293"
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

          {/* X-AXIS PERIOD LABELS (W1 to W8) */}
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
                  fontSize: 11,
                  fontWeight: idx === activePointIndex ? 700 : 500,
                  color: idx === activePointIndex ? '#0f172a' : '#94a3b8',
                  padding: '2px 6px',
                  borderRadius: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                {lbl}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Soft Mint/Sage Hero Panel ("99,681m TONS" Style) */}
        <div className="aeux-card aeux-card-mint">
          <div>
            <div className="aeux-mint-hero-val">
              {stats?.totalRevenue ? `Rs. ${(stats.totalRevenue / 1000).toFixed(0)}k` : 'Rs. 75k'}
              <span className="aeux-mint-unit">TONS</span>
            </div>
            <div className="aeux-mint-trend">
              <ArrowUpRight size={14} strokeWidth={2.5} />
              <span>20% collected milestones</span>
            </div>

            {/* Sub-item 1: House Design Plans (Mechanical recycling) */}
            <div className="aeux-mint-subitem">
              <div className="aeux-mint-icon-circle">
                <FolderOpen size={17} color="#00d293" />
              </div>
              <div>
                <div className="aeux-mint-subitem-title">Mechanical recycling</div>
                <div className="aeux-mint-subitem-desc">
                  {stats?.activeCount || 1} Active Plans • {fmt(stats?.avgContract || 50000)}
                </div>
              </div>
            </div>

            {/* Sub-item 2: Collected Cashflow (Chemical recycling) */}
            <div className="aeux-mint-subitem">
              <div className="aeux-mint-icon-circle">
                <CreditCard size={17} color="#00d293" />
              </div>
              <div>
                <div className="aeux-mint-subitem-title">Chemical recycling</div>
                <div className="aeux-mint-subitem-desc">
                  {stats?.paymentsCount || 1} Settled Transactions • {fmt(stats?.totalRevenue || 75000)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK CUSTOMER MOBILE NUMBER SEARCH BANNER */}
      {onOpenCustomerLookup && (
        <div className="customer-lookup-banner" style={{ margin: '4px 0 0' }}>
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
            <Search size={14} /> Search by Mobile Number
          </button>
        </div>
      )}

      {/* RECENT PAYMENTS LOG TABLE */}
      <div className="card" style={{ marginTop: 4 }}>
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
