import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  CreditCard, Plus, Trash2, X, CheckCircle, AlertCircle,
  TrendingUp, DollarSign
} from 'lucide-react'

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Other']

const emptyPayment = {
  project_id: '',
  client_id: '',
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'Cash',
  reference_number: '',
  notes: '',
}

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [projects, setProjects] = useState([])  // project_payment_summary rows
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyPayment)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [paymentsRes, projectsRes] = await Promise.all([
      supabase
        .from('payments')
        .select(`
          id, amount, payment_date, payment_method, reference_number, notes, created_at,
          projects ( project_name, total_amount ),
          clients ( name )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_payment_summary')
        .select('*')
        .order('project_name'),
    ])
    setPayments(paymentsRes.data || [])
    setProjects(projectsRes.data || [])
    setLoading(false)
  }

  const openAdd = () => {
    setForm(emptyPayment)
    setSelectedProject(null)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setForm(emptyPayment)
    setSelectedProject(null)
  }

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 4000)
  }

  const handleProjectChange = (projectId) => {
    const proj = projects.find(p => p.project_id === projectId)
    setSelectedProject(proj || null)
    setForm(f => ({
      ...f,
      project_id: projectId,
      client_id: proj?.client_id || '',
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.project_id) { showAlert('Please select a project.', 'error'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { showAlert('Enter a valid amount.', 'error'); return }

    setSaving(true)
    const payload = {
      project_id: form.project_id,
      client_id: form.client_id,
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      marked_by: 'Admin',
    }

    const { error } = await supabase.from('payments').insert(payload)
    if (!error) {
      showAlert('✓ Payment marked successfully!')
      fetchData()
      closeModal()
    } else {
      showAlert(error.message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this payment record?')) return
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (!error) { showAlert('Payment removed.'); fetchData() }
    else showAlert(error.message, 'error')
  }

  const filtered = payments.filter(p =>
    (p.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.projects?.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.reference_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalOutstanding = projects.reduce((s, p) => s + Number(p.remaining_amount || 0), 0)

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <CheckCircle size={16} /> {alert.msg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={26} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totalCollected)}</div>
            <div className="stat-label">Total Collected</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertCircle size={26} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totalOutstanding)}</div>
            <div className="stat-label">Total Outstanding</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><CreditCard size={26} /></div>
          <div className="stat-info">
            <div className="stat-value">{payments.length}</div>
            <div className="stat-label">Payment Records</div>
          </div>
        </div>
      </div>

      {/* Per-Project Balance Summary */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>Project Balance Summary</h2>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const pct = p.total_amount > 0 ? Math.min(100, (p.paid_amount / p.total_amount) * 100) : 0
                return (
                  <tr key={p.project_id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.project_name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.project_type}</div>
                    </td>
                    <td>{p.client_name}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(p.total_amount)}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(p.paid_amount)}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: Number(p.remaining_amount) <= 0 ? '#16a34a' : '#dc2626',
                        fontSize: 15
                      }}>
                        {Number(p.remaining_amount) <= 0 ? '✓ Fully Paid' : fmt(p.remaining_amount)}
                      </span>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{pct.toFixed(0)}%</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Records */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search payments by client, project or reference..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-success" onClick={openAdd}>
          <Plus size={16} /> Mark Payment
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>Payment History ({filtered.length})</h2>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={48} />
              <h3>No payment records</h3>
              <p>Use "Mark Payment" to record a client payment.</p>
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
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.clients?.name}</strong></td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{p.projects?.project_name}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>
                          {fmt(p.amount)}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{p.reference_number || '—'}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>
                        {new Date(p.payment_date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13, maxWidth: 180 }}>
                        {p.notes || '—'}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mark Payment Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>Mark Client Payment</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Show balance info if project selected */}
              {selectedProject && (
                <div className="payment-summary">
                  <div className="payment-summary-item">
                    <div className="amount total">{fmt(selectedProject.total_amount)}</div>
                    <div className="label">Total Amount</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="amount paid">{fmt(selectedProject.paid_amount)}</div>
                    <div className="label">Already Paid</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="amount remaining">{fmt(selectedProject.remaining_amount)}</div>
                    <div className="label">Remaining</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSave}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Select Project *</label>
                    <select
                      required
                      value={form.project_id}
                      onChange={e => handleProjectChange(e.target.value)}
                    >
                      <option value="">Choose project...</option>
                      {projects.map(p => (
                        <option key={p.project_id} value={p.project_id}>
                          {p.client_name} — {p.project_name} (Remaining: {fmt(p.remaining_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount Paid (Rs.) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={form.payment_date}
                      onChange={e => setForm({ ...form, payment_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                      {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reference / Cheque No.</label>
                    <input
                      placeholder="TXN-001 or CHQ-0012"
                      value={form.reference_number}
                      onChange={e => setForm({ ...form, reference_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      placeholder="Optional payment notes..."
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? 'Saving...' : '✓ Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

