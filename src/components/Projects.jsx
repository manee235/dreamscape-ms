import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { FolderOpen, Plus, Pencil, Trash2, X, CheckCircle, Calculator, Ruler } from 'lucide-react'
import {
  getStoredRatePerSqft,
  parseSqftFromDescription,
  buildDescriptionWithSqft,
} from '../utils/pricing'

const emptyProject = {
  client_id: '',
  project_name: '',
  project_type: 'House Design & Planning',
  description: '',
  status: 'Active',
  sqft: '',
  rate_per_sqft: '',
  total_amount: '',
  start_date: '',
  end_date: '',
}

const PROJECT_TYPES = [
  'House Design & Planning',
  'Interior Design',
  'Renovation Design',
  'Commercial Design',
  'Landscape Design',
  'Other',
]

const statusBadge = (s) => {
  if (s === 'Active') return 'badge badge-active'
  if (s === 'Completed') return 'badge badge-completed'
  if (s === 'On Hold') return 'badge badge-hold'
  return 'badge badge-cancelled'
}

function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
}

export default function Projects() {
  const [summary, setSummary] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyProject)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [projectsRes, clientsRes, paymentsRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, email, phone').order('name'),
        supabase.from('payments').select('project_id, amount'),
      ])

      const rawProjects = projectsRes.data || []
      const rawClients = clientsRes.data || []
      const rawPayments = paymentsRes.data || []

      const clientMap = new Map()
      rawClients.forEach(c => clientMap.set(c.id, c))

      // Sum payments by project_id
      const paymentTotals = new Map()
      rawPayments.forEach(pm => {
        const prev = paymentTotals.get(pm.project_id) || 0
        paymentTotals.set(pm.project_id, prev + Number(pm.amount || 0))
      })

      const combined = rawProjects.map(p => {
        const client = clientMap.get(p.client_id)
        const total = Number(p.total_amount || 0)
        const paid = paymentTotals.get(p.id) || 0
        const remaining = Math.max(0, total - paid)
        const { sqft, rate } = parseSqftFromDescription(p.description)
        return {
          project_id: p.id,
          project_name: p.project_name,
          project_type: p.project_type,
          description: p.description,
          status: p.status,
          total_amount: total,
          paid_amount: paid,
          remaining_amount: remaining,
          sqft: sqft || '',
          rate_per_sqft: rate || '',
          client_id: p.client_id,
          client_name: client?.name || 'Unknown Client',
          client_phone: client?.phone,
          start_date: p.start_date,
          end_date: p.end_date,
          created_at: p.created_at,
        }
      })

      setSummary(combined)
      setClients(rawClients)
    } catch (err) {
      console.error('Projects fetch error:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    // Realtime subscription
    const channel = supabase
      .channel('realtime-projects-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const openAdd = () => {
    const currentRate = getStoredRatePerSqft()
    setForm({
      ...emptyProject,
      rate_per_sqft: currentRate,
    })
    setEditing(null)
    setModal(true)
  }

  const openEdit = (p) => {
    const { sqft, rate, cleanDesc } = parseSqftFromDescription(p.description)
    const rateToUse = rate || (sqft && p.total_amount ? (Number(p.total_amount) / Number(sqft)).toFixed(2) : getStoredRatePerSqft())
    setForm({
      client_id: p.client_id,
      project_name: p.project_name,
      project_type: p.project_type,
      description: cleanDesc || '',
      status: p.status,
      sqft: sqft || '',
      rate_per_sqft: rateToUse,
      total_amount: p.total_amount,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
    })
    setEditing(p.project_id)
    setModal(true)
  }

  const closeModal = () => { setModal(false); setForm(emptyProject); setEditing(null) }

  const handleSqftChange = (val) => {
    const sqftNum = parseFloat(val)
    const rateNum = parseFloat(form.rate_per_sqft) || getStoredRatePerSqft()
    if (!isNaN(sqftNum) && sqftNum > 0) {
      const calculatedPrice = (sqftNum * rateNum).toFixed(2)
      setForm(prev => ({
        ...prev,
        sqft: val,
        rate_per_sqft: prev.rate_per_sqft || rateNum,
        total_amount: calculatedPrice,
      }))
    } else {
      setForm(prev => ({ ...prev, sqft: val }))
    }
  }

  const handleRateChange = (val) => {
    const rateNum = parseFloat(val)
    const sqftNum = parseFloat(form.sqft)
    if (!isNaN(sqftNum) && sqftNum > 0 && !isNaN(rateNum) && rateNum > 0) {
      const calculatedPrice = (sqftNum * rateNum).toFixed(2)
      setForm(prev => ({
        ...prev,
        rate_per_sqft: val,
        total_amount: calculatedPrice,
      }))
    } else {
      setForm(prev => ({ ...prev, rate_per_sqft: val }))
    }
  }

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const finalDescription = buildDescriptionWithSqft(form.description, form.sqft, form.rate_per_sqft)
    const payload = {
      client_id: form.client_id,
      project_name: form.project_name,
      project_type: form.project_type,
      description: finalDescription || null,
      status: form.status,
      total_amount: parseFloat(form.total_amount) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }
    if (editing) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editing)
      if (!error) { showAlert('Project updated!'); fetchData(); closeModal() }
      else showAlert(error.message, 'error')
    } else {
      const { error } = await supabase.from('projects').insert(payload)
      if (!error) { showAlert('Project added!'); fetchData(); closeModal() }
      else showAlert(error.message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its payments?')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) { showAlert('Project deleted.'); fetchData() }
    else showAlert(error.message, 'error')
  }

  const filtered = summary.filter(p => {
    const matchSearch = p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <CheckCircle size={16} /> {alert.msg}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by project or client name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-controls-group">
          <select
            className="search-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {loading && summary.length === 0 ? (
        <div className="loading"><div className="spinner" /> Loading projects...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>Architectural Design Projects ({filtered.length})</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Realtime synced</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={48} />
              <h3>No projects found</h3>
              <p>Create your first project to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-wrapper table-desktop-only">
                <table>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Total Amount</th>
                      <th>Paid to Date</th>
                      <th>Remaining</th>
                      <th>Progress</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const pct = p.total_amount > 0
                        ? Math.min(100, (p.paid_amount / p.total_amount) * 100)
                        : 0
                      const isPaid = Number(p.remaining_amount) <= 0

                      return (
                        <tr key={p.project_id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                              <span>{p.project_name}</span>
                              {p.sqft && (
                                <span className="sqft-badge" title={`House Plan Area: ${p.sqft} sq.ft`}>
                                  <Ruler size={10} /> {Number(p.sqft).toLocaleString()} sq.ft
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.project_type}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.client_name}</div>
                            {p.client_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.client_phone}</div>}
                          </td>
                          <td><span className={statusBadge(p.status)}>{p.status}</span></td>
                          <td style={{ fontWeight: 600 }}>{fmt(p.total_amount)}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmt(p.paid_amount)}</td>
                          <td style={{ color: isPaid ? 'var(--primary)' : '#f43f5e', fontWeight: 800 }}>
                            {isPaid ? '✓ Fully Paid' : fmt(p.remaining_amount)}
                          </td>
                          <td style={{ minWidth: 100 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{pct.toFixed(0)}%</div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>
                                <Pencil size={13} />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.project_id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-cards-list" style={{ padding: 16 }}>
                {filtered.map(p => {
                  const pct = p.total_amount > 0 ? Math.min(100, (p.paid_amount / p.total_amount) * 100) : 0
                  const isPaid = Number(p.remaining_amount) <= 0

                  return (
                    <div key={p.project_id} className="mobile-data-card">
                      <div className="mobile-data-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 14 }}>{p.project_name}</strong>
                            {p.sqft && (
                              <span className="sqft-badge">
                                <Ruler size={10} /> {Number(p.sqft).toLocaleString()} sq.ft
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.client_name} • {p.project_type}</div>
                        </div>
                        <span className={statusBadge(p.status)}>{p.status}</span>
                      </div>
                      <div className="mobile-data-card-row">
                        <span>Contract Value:</span>
                        <strong>{fmt(p.total_amount)}</strong>
                      </div>
                      <div className="mobile-data-card-row">
                        <span>Paid:</span>
                        <strong style={{ color: 'var(--primary)' }}>{fmt(p.paid_amount)}</strong>
                      </div>
                      <div className="mobile-data-card-row">
                        <span>Remaining:</span>
                        <strong style={{ color: isPaid ? 'var(--primary)' : '#f43f5e' }}>
                          {isPaid ? '✓ Fully Paid' : fmt(p.remaining_amount)}
                        </strong>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mobile-data-card-actions">
                        <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(p)}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.project_id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Edit Project' : 'Add New Project'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Client *</label>
                    <select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                      <option value="">Select client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Project Type</label>
                    <select value={form.project_type} onChange={e => setForm({ ...form, project_type: e.target.value })}>
                      {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Project Name *</label>
                    <input required value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. Modern 2-Story Luxury Residence" />
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Project specifications, rooms, design style..." />
                  </div>

                  {/* Pricing by Square Feet Row */}
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Ruler size={14} color="#059669" />
                      <span>Plan Area (Square Feet / sq. ft.)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.sqft}
                      onChange={e => handleSqftChange(e.target.value)}
                      placeholder="e.g. 2500"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calculator size={14} color="#059669" />
                      <span>Rate per Sq. Ft. (Rs.)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.rate_per_sqft}
                      onChange={e => handleRateChange(e.target.value)}
                      placeholder={String(getStoredRatePerSqft())}
                    />
                  </div>

                  {/* Auto-calculation Banner */}
                  {Boolean(form.sqft && parseFloat(form.sqft) > 0) && (
                    <div className="sqft-calc-preview">
                      <Calculator size={15} color="#059669" />
                      <span>
                        Calculated: <strong>{Number(form.sqft).toLocaleString()} sq. ft.</strong> × <strong>Rs. {Number(form.rate_per_sqft || getStoredRatePerSqft()).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong> = <strong style={{ color: '#059669' }}>Rs. {Number(form.total_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Total Project Contract (Rs.) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.total_amount}
                      onChange={e => setForm({ ...form, total_amount: e.target.value })}
                      placeholder="e.g. 375000.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {['Active', 'Completed', 'On Hold', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Expected End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Project'}
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
