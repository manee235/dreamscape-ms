import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  CreditCard,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Download,
  MessageCircle,
  FileText,
  DollarSign,
  ArrowUpRight,
  Clock,
  Check,
} from 'lucide-react'
import {
  generateReceiptPDF,
  shareReceiptViaWhatsApp,
  generateWhatsAppMessage,
  formatWhatsAppPhone,
  formatLKR,
} from '../utils/receiptGenerator'

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Other']

const emptyPayment = {
  project_id: '',
  client_id: '',
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'Bank Transfer',
  reference_number: '',
  notes: '',
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyPayment)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [autoWhatsApp, setAutoWhatsApp] = useState(true)

  // Success dialog state after saving payment
  const [successReceipt, setSuccessReceipt] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    fetchData()

    // Supabase Realtime channel for instant syncing without page reload!
    const channel = supabase
      .channel('realtime-payments-sync')
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
      const [paymentsRes, projectsRes, clientsRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('project_name'),
        supabase.from('clients').select('id, name, phone, email'),
      ])

      const rawPayments = paymentsRes.data || []
      const rawProjects = projectsRes.data || []
      const rawClients = clientsRes.data || []

      const clientMap = new Map()
      rawClients.forEach((c) => clientMap.set(c.id, c))

      const projectMap = new Map()
      rawProjects.forEach((p) => projectMap.set(p.id, p))

      // Sum payments per project
      const paymentTotals = new Map()
      rawPayments.forEach((pm) => {
        const prev = paymentTotals.get(pm.project_id) || 0
        paymentTotals.set(pm.project_id, prev + Number(pm.amount || 0))
      })

      // Enriched project summary
      const projectSummaries = rawProjects.map((p) => {
        const total = Number(p.total_amount || 0)
        const paid = paymentTotals.get(p.id) || 0
        const remaining = Math.max(0, total - paid)
        const client = clientMap.get(p.client_id)
        return {
          project_id: p.id,
          project_name: p.project_name,
          project_type: p.project_type,
          client_id: p.client_id,
          client_name: client?.name || 'Unknown Client',
          client_phone: client?.phone || '',
          client_email: client?.email || '',
          total_amount: total,
          paid_amount: paid,
          remaining_amount: remaining,
        }
      })

      // Enriched payments list
      const enrichedPayments = rawPayments.map((pm) => {
        const prj = projectMap.get(pm.project_id)
        const client = clientMap.get(pm.client_id) || clientMap.get(prj?.client_id)
        const totalAmt = Number(prj?.total_amount || 0)
        const totalPaidToDate = paymentTotals.get(pm.project_id) || 0
        const remAmt = Math.max(0, totalAmt - totalPaidToDate)

        return {
          ...pm,
          client_name: client?.name || 'Unknown Client',
          client_phone: client?.phone || '',
          client_email: client?.email || '',
          project_name: prj?.project_name || 'House Design Project',
          project_type: prj?.project_type || 'House Design & Planning',
          project_total: totalAmt,
          project_remaining: remAmt,
          project_paid_total: totalPaidToDate,
        }
      })

      setPayments(enrichedPayments)
      setProjects(projectSummaries)
    } catch (err) {
      console.error('Payments fetch error:', err)
    }
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
    const proj = projects.find((p) => p.project_id === projectId)
    setSelectedProject(proj || null)
    setForm((f) => ({
      ...f,
      project_id: projectId,
      client_id: proj?.client_id || '',
    }))
  }

  const sendWhatsApp = async (receiptData) => {
    await shareReceiptViaWhatsApp(receiptData, true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.project_id) {
      showAlert('Please select a project.', 'error')
      return
    }
    const paymentAmount = parseFloat(form.amount)
    if (!paymentAmount || paymentAmount <= 0) {
      showAlert('Enter a valid payment amount.', 'error')
      return
    }

    setSaving(true)
    const payload = {
      project_id: form.project_id,
      client_id: form.client_id,
      amount: paymentAmount,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      marked_by: 'Admin',
    }

    const { data: inserted, error } = await supabase.from('payments').insert(payload).select().single()

    if (!error) {
      const totalAmount = Number(selectedProject?.total_amount || 0)
      const previousPaid = Number(selectedProject?.paid_amount || 0)
      const newTotalPaid = previousPaid + paymentAmount
      const remainingAmount = Math.max(0, totalAmount - newTotalPaid)

      const receiptPayload = {
        receiptNo: 'RCP-' + (inserted?.id ? inserted.id.substring(0, 8).toUpperCase() : Date.now().toString().slice(-6)),
        clientName: selectedProject?.client_name || 'Client',
        clientPhone: selectedProject?.client_phone || '',
        clientEmail: selectedProject?.client_email || '',
        projectName: selectedProject?.project_name || 'House Design',
        projectType: selectedProject?.project_type || 'House Design & Planning',
        amountPaid: paymentAmount,
        totalAmount: totalAmount,
        totalPaid: newTotalPaid,
        remainingAmount: remainingAmount,
        paymentDate: form.payment_date,
        paymentMethod: form.payment_method,
        referenceNumber: form.reference_number,
        notes: form.notes,
      }

      // If auto-send is checked, immediately share/open WhatsApp with the PDF file
      if (autoWhatsApp) {
        await shareReceiptViaWhatsApp(receiptPayload, true)
      } else {
        try {
          generateReceiptPDF(receiptPayload)
        } catch (pdfErr) {
          console.error('PDF Generation error:', pdfErr)
        }
      }

      setSuccessReceipt(receiptPayload)
      setShowSuccessModal(true)
      closeModal()
      fetchData()
    } else {
      showAlert(error.message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this payment record?')) return
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (!error) {
      showAlert('Payment removed.')
      fetchData()
    } else {
      showAlert(error.message, 'error')
    }
  }

  const filtered = payments.filter(
    (p) =>
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.reference_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalOutstanding = projects.reduce((s, p) => s + Number(p.remaining_amount || 0), 0)

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <CheckCircle size={16} /> {alert.msg}
        </div>
      )}

      {/* OBSIDIAN TOP STATS CAPSULES (Matching WindPulse Design) */}
      <div className="payment-stats-grid">
        {/* 1. Total Collected */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Total Revenue Collected</span>
            <div className="glow-badge-icon emerald">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val" style={{ color: 'var(--primary)' }}>
            {formatLKR(totalCollected)}
          </div>
          <div className="obsidian-card-footer">
            <span className="trend-pill positive">
              <ArrowUpRight size={13} /> {totalCollected > 0 ? '+18.4% received to date' : '0.0% received to date'}
            </span>
            <span className="card-mini-link">Settled ↗</span>
          </div>
        </div>

        {/* 2. Total Outstanding */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Total Outstanding Balance</span>
            <div className="glow-badge-icon amber">
              <Clock size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val" style={{ color: totalOutstanding > 0 ? '#f43f5e' : 'var(--primary)' }}>
            {formatLKR(totalOutstanding)}
          </div>
          <div className="obsidian-card-footer">
            <span className="trend-pill negative" style={{ color: totalOutstanding > 0 ? '#f43f5e' : 'var(--primary)' }}>
              {totalOutstanding > 0 ? 'Due across active plans' : '✓ No outstanding balance'}
            </span>
            <span className="card-mini-link">Pending ↗</span>
          </div>
        </div>

        {/* 3. Payment Records Count */}
        <div className="obsidian-card">
          <div className="obsidian-card-top">
            <span className="obsidian-card-label">Logged Transactions</span>
            <div className="glow-badge-icon blue">
              <CreditCard size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="obsidian-card-val">
            {payments.length} <span className="unit">Records</span>
          </div>
          <div className="obsidian-card-footer">
            <span className="trend-pill positive">
              <Check size={13} /> Synced via Supabase Realtime
            </span>
            <span className="card-mini-link">Live ↗</span>
          </div>
        </div>
      </div>

      {/* PROJECT BALANCE SUMMARY TABLE */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Project Balance Summary</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Track real-time client payments, remaining debt, and settlement progress
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={15} /> Mark Payment
          </button>
        </div>

        {/* Desktop Table */}
        <div className="table-wrapper table-desktop-only">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Total Contract</th>
                <th>Paid to Date</th>
                <th>Remaining</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No project balances recorded yet. Add clients and projects to track payments.
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const pct =
                    p.total_amount > 0 ? Math.min(100, (p.paid_amount / p.total_amount) * 100) : 0
                  const isPaid = Number(p.remaining_amount) <= 0

                  return (
                    <tr key={p.project_id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.project_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.project_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.client_name}</div>
                        {p.client_phone && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.client_phone}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatLKR(p.total_amount)}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatLKR(p.paid_amount)}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 800,
                            color: isPaid ? 'var(--primary)' : '#f43f5e',
                            fontSize: 14,
                          }}
                        >
                          {isPaid ? '✓ Fully Paid' : formatLKR(p.remaining_amount)}
                        </span>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                          <span>{pct.toFixed(0)}%</span>
                          <span>{isPaid ? 'Completed' : 'Active'}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Native Card View (for screens <= 768px) */}
        <div className="mobile-cards-list" style={{ padding: 16 }}>
          {projects.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
              <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No project balance records yet.</p>
            </div>
          ) : (
            projects.map((p) => {
              const pct = p.total_amount > 0 ? Math.min(100, (p.paid_amount / p.total_amount) * 100) : 0
              const isPaid = Number(p.remaining_amount) <= 0
              return (
              <div key={p.project_id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <strong style={{ fontSize: 14 }}>{p.project_name}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client_name} • {p.client_phone}</div>
                  </div>
                  <span className={isPaid ? 'badge badge-active' : 'badge badge-hold'}>
                    {isPaid ? 'Settled' : 'Due'}
                  </span>
                </div>
                <div className="mobile-data-card-row">
                  <span>Total Value:</span>
                  <strong>{formatLKR(p.total_amount)}</strong>
                </div>
                <div className="mobile-data-card-row">
                  <span>Paid:</span>
                  <strong style={{ color: 'var(--primary)' }}>{formatLKR(p.paid_amount)}</strong>
                </div>
                <div className="mobile-data-card-row">
                  <span>Remaining:</span>
                  <strong style={{ color: isPaid ? 'var(--primary)' : '#f43f5e' }}>
                    {isPaid ? '✓ Fully Paid' : formatLKR(p.remaining_amount)}
                  </strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          }))}
        </div>
      </div>

      {/* PAYMENT TRANSACTION HISTORY TABLE */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by client, project, or reference number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Mark Payment
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Payment Transaction Log ({filtered.length})</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            PDF receipts and WhatsApp ready
          </span>
        </div>

        {/* Desktop Table */}
        <div className="table-wrapper table-desktop-only">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Project</th>
                <th>Amount Paid</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Receipt / WhatsApp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No payment transactions recorded yet. Click "+ Mark Payment" to log your first payment.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const rowReceiptData = {
                    receiptNo: 'RCP-' + (p.id ? p.id.substring(0, 8).toUpperCase() : '001'),
                    clientName: p.client_name,
                    clientPhone: p.client_phone,
                    clientEmail: p.client_email,
                    projectName: p.project_name,
                    projectType: p.project_type,
                    amountPaid: Number(p.amount),
                    totalAmount: p.project_total,
                    totalPaid: p.project_paid_total,
                    remainingAmount: p.project_remaining,
                    paymentDate: p.payment_date,
                    paymentMethod: p.payment_method,
                    referenceNumber: p.reference_number,
                    notes: p.notes,
                  }

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.client_name}</strong>
                        {p.client_phone && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.client_phone}</div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.project_name}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 14 }}>
                          {formatLKR(p.amount)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-active" style={{ fontSize: 11 }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.reference_number || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(p.payment_date).toLocaleDateString('en-GB')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="Download PDF"
                            onClick={() => generateReceiptPDF(rowReceiptData)}
                          >
                            <FileText size={13} /> PDF
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#25D366', color: '#ffffff', border: 'none' }}
                            title="Send to client WhatsApp"
                            onClick={() => sendWhatsApp(rowReceiptData)}
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View for Payment History */}
        <div className="mobile-cards-list" style={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
              <CreditCard size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No payment transactions recorded yet.</p>
            </div>
          ) : (
            filtered.map((p) => {
            const rowReceiptData = {
              receiptNo: 'RCP-' + (p.id ? p.id.substring(0, 8).toUpperCase() : '001'),
              clientName: p.client_name,
              clientPhone: p.client_phone,
              clientEmail: p.client_email,
              projectName: p.project_name,
              projectType: p.project_type,
              amountPaid: Number(p.amount),
              totalAmount: p.project_total,
              totalPaid: p.project_paid_total,
              remainingAmount: p.project_remaining,
              paymentDate: p.payment_date,
              paymentMethod: p.payment_method,
              referenceNumber: p.reference_number,
              notes: p.notes,
            }

            return (
              <div key={p.id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <strong>{p.client_name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.project_name}</div>
                  </div>
                  <strong style={{ color: 'var(--primary)', fontSize: 15 }}>{formatLKR(p.amount)}</strong>
                </div>
                <div className="mobile-data-card-row">
                  <span>Method &amp; Ref:</span>
                  <span>{p.payment_method} {p.reference_number ? `(${p.reference_number})` : ''}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span>Date:</span>
                  <span>{new Date(p.payment_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="mobile-data-card-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => generateReceiptPDF(rowReceiptData)}
                  >
                    <FileText size={13} /> PDF
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ flex: 1, justifyContent: 'center', background: '#25D366', color: '#fff' }}
                    onClick={() => sendWhatsApp(rowReceiptData)}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          }))}
        </div>
      </div>

      {/* MARK PAYMENT MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>Mark Client Payment</h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Show balance info if project selected */}
              {selectedProject && (
                <div className="payment-summary">
                  <div className="payment-summary-item">
                    <div className="amount total">{formatLKR(selectedProject.total_amount)}</div>
                    <div className="label">Total Contract</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="amount paid">{formatLKR(selectedProject.paid_amount)}</div>
                    <div className="label">Already Paid</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="amount remaining">
                      {formatLKR(selectedProject.remaining_amount)}
                    </div>
                    <div className="label">Remaining Due</div>
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
                      onChange={(e) => handleProjectChange(e.target.value)}
                    >
                      <option value="">Choose project...</option>
                      {projects.map((p) => (
                        <option key={p.project_id} value={p.project_id}>
                          {p.client_name} • {p.project_name}
                        </option>
                      ))}
                    </select>
                    {selectedProject && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginTop: 4,
                          padding: '0 2px',
                        }}
                      >
                        <span>Client: <strong style={{ color: 'var(--text-primary)' }}>{selectedProject.client_name}</strong></span>
                        <span>Phone: <strong style={{ color: 'var(--primary)' }}>{selectedProject.client_phone || 'No phone'}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Amount Paid (Rs.) *</label>
                      {selectedProject && Number(selectedProject.remaining_amount) > 0 && (
                        <button
                          type="button"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: 0,
                          }}
                          onClick={() => setForm({ ...form, amount: String(selectedProject.remaining_amount) })}
                        >
                          Full Balance
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 50000"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                    {selectedProject && Number(selectedProject.remaining_amount) > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6 }}
                          onClick={() => setForm({ ...form, amount: String(selectedProject.remaining_amount) })}
                        >
                          Full Due ({formatLKR(selectedProject.remaining_amount)})
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 6 }}
                          onClick={() => setForm({ ...form, amount: String(Math.round(selectedProject.remaining_amount * 0.5)) })}
                        >
                          50% ({formatLKR(Math.round(selectedProject.remaining_amount * 0.5))})
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Payment Date *</label>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() => setForm({ ...form, payment_date: new Date().toISOString().split('T')[0] })}
                      >
                        Today
                      </button>
                    </div>
                    <input
                      type="date"
                      required
                      value={form.payment_date}
                      onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={form.payment_method}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reference / Cheque No.</label>
                    <input
                      placeholder="TXN-001 or CHQ-0012"
                      value={form.reference_number}
                      onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Optional payment notes..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  {/* Auto WhatsApp Dispatch Option */}
                  <div
                    className="form-group full-width"
                    style={{
                      marginTop: 2,
                      padding: '10px 14px',
                      background: 'var(--bg-card-sub)',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={autoWhatsApp}
                        onChange={(e) => setAutoWhatsApp(e.target.checked)}
                        style={{ width: 17, height: 17, accentColor: '#25D366', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        <MessageCircle size={15} color="#25D366" />
                        <span>Send PDF Receipt to Client's WhatsApp automatically upon saving</span>
                      </div>
                    </label>
                    {selectedProject?.client_phone && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 27, marginTop: 2 }}>
                        Recipient: <strong style={{ color: '#25D366' }}>{selectedProject.client_phone}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? 'Saving...' : '✓ Confirm & Generate Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* POST-PAYMENT SUCCESS & WHATSAPP MODAL */}
      {showSuccessModal && successReceipt && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowSuccessModal(false)}
        >
          <div className="modal" style={{ maxWidth: 500, textAlign: 'center' }}>
            <div style={{ padding: '32px 24px 24px' }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  background: 'rgba(0, 210, 147, 0.15)',
                  color: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 20px rgba(0, 210, 147, 0.25)',
                }}
              >
                <CheckCircle size={32} />
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                Payment Successfully Recorded!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                Official PDF receipt has been generated and downloaded.
              </p>

              {/* Receipt Summary Card */}
              <div
                style={{
                  background: 'var(--bg-card-sub)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  padding: 16,
                  textAlign: 'left',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Client:</span>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {successReceipt.clientName}{' '}
                    {successReceipt.clientPhone ? `(${successReceipt.clientPhone})` : ''}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Project:</span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {successReceipt.projectName}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    borderTop: '1px dashed var(--border-color)',
                    paddingTop: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Amount Paid:</span>
                  <strong style={{ fontSize: 15, color: 'var(--primary)' }}>
                    {formatLKR(successReceipt.amountPaid)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Contract Value:</span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    {formatLKR(successReceipt.totalAmount)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Remaining to Pay:
                  </span>
                  <strong
                    style={{
                      fontSize: 14,
                      color: Number(successReceipt.remainingAmount) <= 0 ? 'var(--primary)' : '#f43f5e',
                    }}
                  >
                    {Number(successReceipt.remainingAmount) <= 0
                      ? '✓ Fully Paid'
                      : formatLKR(successReceipt.remainingAmount)}
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn"
                  style={{
                    background: '#25D366',
                    color: 'white',
                    justifyContent: 'center',
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                  onClick={() => sendWhatsApp(successReceipt)}
                >
                  <MessageCircle size={18} /> Send / Share PDF to WhatsApp
                </button>

                <button
                  className="btn btn-outline"
                  style={{ justifyContent: 'center', padding: 11 }}
                  onClick={() => generateReceiptPDF(successReceipt)}
                >
                  <Download size={15} /> Download PDF Receipt File
                </button>

                <div
                  style={{
                    background: 'rgba(37, 211, 102, 0.08)',
                    border: '1px solid rgba(37, 211, 102, 0.25)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    textAlign: 'left',
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>WhatsApp Delivery:</strong> On mobile phones, WhatsApp will open directly with the PDF file attached. On desktop, attach the automatically downloaded PDF file into the opened chat.
                </div>

                <button
                  className="btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                  onClick={() => setShowSuccessModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
