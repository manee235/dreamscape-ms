import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  Users,
  FolderOpen,
  CreditCard,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [clientsRes, projectsRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('projects').select('id, project_name, status, total_amount'),
        supabase.from('payments').select('id, amount, payment_date, payment_method, reference_number, project_id, client_id, created_at'),
      ])

      const clientsList = clientsRes.data || []
      const projectsList = projectsRes.data || []
      const paymentsList = paymentsRes.data || []

      const totalRevenue = paymentsList.reduce((s, p) => s + Number(p.amount || 0), 0)
      const totalProjectBudget = projectsList.reduce((s, p) => s + Number(p.total_amount || 0), 0)
      const totalOutstanding = Math.max(0, totalProjectBudget - totalRevenue)
      const activeProjects = projectsList.filter((p) => p.status === 'Active').length

      setStats({
        clients: clientsRes.count ?? clientsList.length,
        totalProjects: projectsList.length,
        activeProjects,
        totalRevenue,
        totalOutstanding,
        paymentsCount: paymentsList.length,
      })

      // Map recent payments with client and project name safely
      const clientMap = new Map()
      const projectMap = new Map()

      // Fetch names if needed
      const { data: allClients } = await supabase.from('clients').select('id, name')
      ;(allClients || []).forEach(c => clientMap.set(c.id, c.name))
      projectsList.forEach(p => projectMap.set(p.id, p.project_name))

      const sortedPayments = [...paymentsList]
        .sort((a, b) => new Date(b.created_at || b.payment_date) - new Date(a.created_at || a.payment_date))
        .slice(0, 6)
        .map(p => ({
          ...p,
          clientName: clientMap.get(p.client_id) || 'Client',
          projectName: projectMap.get(p.project_id) || 'House Design',
        }))

      setRecentPayments(sortedPayments)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> Loading dashboard...
      </div>
    )
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={26} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats?.clients}</div>
            <div className="stat-label">Total Clients</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FolderOpen size={26} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats?.activeProjects}</div>
            <div className="stat-label">Active Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={26} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(stats?.totalRevenue)}</div>
            <div className="stat-label">Total Collected</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertCircle size={26} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(stats?.totalOutstanding)}</div>
            <div className="stat-label">Outstanding Balance</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><CreditCard size={26} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats?.paymentsCount}</div>
            <div className="stat-label">Total Payments</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Payments</h2>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('payments')}>
            View All
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentPayments.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={48} />
              <h3>No payments yet</h3>
              <p>Payments will appear here once recorded.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Project</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.clientName}</strong></td>
                      <td style={{ color: '#64748b' }}>{p.projectName}</td>
                      <td><strong style={{ color: '#16a34a' }}>{fmt(p.amount)}</strong></td>
                      <td>{p.payment_method}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
