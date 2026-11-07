import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Users, Plus, Pencil, Trash2, Phone, Mail, MapPin, X, CheckCircle, MessageCircle } from 'lucide-react'
import { formatWhatsAppPhone } from '../utils/receiptGenerator'

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

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()

    // Realtime sync on clients table
    const channel = supabase
      .channel('realtime-clients-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchClients())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  const openClientWhatsApp = (phone, name) => {
    const formatted = formatWhatsAppPhone(phone)
    if (!formatted) {
      alert('No valid phone number for this client.')
      return
    }
    const text = `Hello ${name}, this is Dreamscape House Design & Planning Agency. How can we assist you today?`
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, '_blank')
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

      {loading && clients.length === 0 ? (
        <div className="loading"><div className="spinner" /> Loading clients...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>Registered Customers ({filtered.length})</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Realtime synced</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h3>No clients found</h3>
              <p>Add your first client to start designing.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-wrapper table-desktop-only">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Address</th>
                      <th>Added Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td>
                          <strong style={{ fontSize: 14 }}>{c.name}</strong>
                        </td>
                        <td>
                          {c.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                              <Phone size={12} /> {c.phone}
                            </div>
                          )}
                          {c.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                              <Mail size={12} /> {c.email}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {c.address ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={12} /> {c.address}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(c.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {c.phone && (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#25D366', color: '#fff' }}
                                title="Chat on WhatsApp"
                                onClick={() => openClientWhatsApp(c.phone, c.name)}
                              >
                                <MessageCircle size={13} />
                              </button>
                            )}
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

              {/* Mobile View */}
              <div className="mobile-cards-list" style={{ padding: 16 }}>
                {filtered.map(c => (
                  <div key={c.id} className="mobile-data-card">
                    <div className="mobile-data-card-header">
                      <div>
                        <strong style={{ fontSize: 15 }}>{c.name}</strong>
                        {c.phone && <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{c.phone}</div>}
                      </div>
                      <span className="badge badge-active">Client</span>
                    </div>
                    {c.email && (
                      <div className="mobile-data-card-row">
                        <span>Email:</span>
                        <span>{c.email}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="mobile-data-card-row">
                        <span>Address:</span>
                        <span>{c.address}</span>
                      </div>
                    )}
                    <div className="mobile-data-card-actions">
                      {c.phone && (
                        <button
                          className="btn btn-sm"
                          style={{ flex: 1, justifyContent: 'center', background: '#25D366', color: '#fff' }}
                          onClick={() => openClientWhatsApp(c.phone, c.name)}
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(c)}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ADD/EDIT CLIENT MODAL */}
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
                    <label>Phone Number *</label>
                    <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="077 1234567" />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Client property / contact address..." />
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
