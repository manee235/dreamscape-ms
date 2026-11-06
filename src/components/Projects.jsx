import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { FolderOpen, Plus, Pencil, Trash2, X, CheckCircle } from 'lucide-react'

const emptyProject = {
  client_id: '',
  project_name: '',
  project_type: 'House Design & Planning',
  description: '',
  status: 'Active',
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

  useEffect(() => { fetchData() }, [])

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
        return {
          project_id: p.id,
          project_name: p.project_name,
          project_type: p.project_type,
          description: p.description,
          status: p.status,
          total_amount: total,
          paid_amount: paid,
          remaining_amount: remaining,
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

  const openAdd = () => { setForm(emptyProject); setEditing(null); setModal(true) }
  const openEdit = (p) => {
    setForm({
      client_id: p.client_id,
      project_name: p.project_name,
      project_type: p.project_type,
      description: p.description || '',
      status: p.status,
      total_amount: p.total_amount,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
    })
    setEditing(p.project_id)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setForm(emptyProject); setEditing(null) }

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
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

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by project or client name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none' }}
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

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>All Projects ({filtered.length})</h2>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={48} />
              <h3>No projects found</h3>
              <p>Create your first project to get started.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Paid</th>
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
                    return (
                      <tr key={p.project_id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{p.project_name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.project_type}</div>
                        </td>
                        <td style={{ color: '#1e293b' }}>{p.client_name}</td>
                        <td><span className={statusBadge(p.status)}>{p.status}</span></td>
                        <td style={{ fontWeight: 600 }}>{fmt(p.total_amount)}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(p.paid_amount)}</td>
                        <td style={{ color: p.remaining_amount > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                          {fmt(p.remaining_amount)}
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{pct.toFixed(0)}%</div>
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
          )}
        </div>
      )}

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
                    <input required value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. Modern 2-Story Residence" />
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Project details..." />
                  </div>
                  <div className="form-group">
                    <label>Total Project Amount (Rs.) *</label>
                    <input type="number" required min="0" step="0.01" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} placeholder="850000.00" />
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
