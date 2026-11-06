import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Users, Plus, Pencil, Trash2, Phone, Mail, MapPin, X, CheckCircle } from 'lucide-react'

const emptyClient = { name: '', email: '', phone: '', address: '' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyClient)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const openAdd = () => { setForm(emptyClient); setEditing(null); setModal(true) }
  const openEdit = (c) => { setForm({ ...c }); setEditing(c.id); setModal(true) }
  const closeModal = () => { setModal(false); setForm(emptyClient); setEditing(null) }

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      const { error } = await supabase.from('clients').update(form).eq('id', editing)
      if (!error) { showAlert('Client updated successfully!'); fetchClients(); closeModal() }
      else showAlert(error.message, 'error')
    } else {
      const { error } = await supabase.from('clients').insert(form)
      if (!error) { showAlert('Client added successfully!'); fetchClients(); closeModal() }
      else showAlert(error.message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client and all their projects/payments?')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) { showAlert('Client deleted.'); fetchClients() }
    else showAlert(error.message, 'error')
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

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
          placeholder="Search clients by name, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>All Clients ({filtered.length})</h2>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h3>No clients found</h3>
              <p>Add your first client to get started.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Added</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                      </td>
                      <td>
                        {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}><Mail size={12} />{c.email}</div>}
                        {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}><Phone size={12} />{c.phone}</div>}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>
                        {c.address && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} />{c.address}</span>}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <h2>{editing ? 'Edit Client' : 'Add New Client'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Full Name *</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client full name" />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="077 1234567" />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Client address..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Client'}
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

