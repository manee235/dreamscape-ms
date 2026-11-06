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
  Send,
  ExternalLink,
} from 'lucide-react'
import {
  generateReceiptPDF,
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
  payment_method: 'Cash',
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

  // Success dialog state after saving payment
  const [successReceipt, setSuccessReceipt] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    fetchData()
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

  // Open WhatsApp with pre-filled message
  const sendWhatsApp = (receiptData) => {
    const phone = formatWhatsAppPhone(receiptData.clientPhone)
    const msg = generateWhatsAppMessage(receiptData)
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
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
      // Calculate updated figures
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

      // 1. Automatically generate and download PDF
      try {
        generateReceiptPDF(receiptPayload)
      } catch (pdfErr) {
        console.error('PDF Generation error:', pdfErr)
      }

      // 2. Set success modal state & open
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

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon green">
            <TrendingUp size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>
              {formatLKR(totalCollected)}
            </div>
            <div className="stat-label">Total Collected</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertCircle size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>
              {formatLKR(totalOutstanding)}
            </div>
            <div className="stat-label">Total Outstanding</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <CreditCard size={26} />
          </div>
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
              {projects.map((p) => {
                const pct =
                  p.total_amount > 0 ? Math.min(100, (p.paid_amount / p.total_amount) * 100) : 0
                return (
                  <tr key={p.project_id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.project_name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.project_type}</div>
                    </td>
                    <td>
                      <div>{p.client_name}</div>
                      {p.client_phone && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>{p.client_phone}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatLKR(p.total_amount)}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatLKR(p.paid_amount)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: Number(p.remaining_amount) <= 0 ? '#16a34a' : '#dc2626',
                          fontSize: 15,
                        }}
                      >
                        {Number(p.remaining_amount) <= 0
                          ? '✓ Fully Paid'
                          : formatLKR(p.remaining_amount)}
                      </span>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                        {pct.toFixed(0)}%
                      </div>
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

      {/* Payment Records Header */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search payments by client, project or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-success" onClick={openAdd}>
          <Plus size={16} /> Mark Payment
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" /> Loading payments...
        </div>
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
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Receipt &amp; WhatsApp</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
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
                            <div style={{ fontSize: 12, color: '#64748b' }}>{p.client_phone}</div>
                          )}
                        </td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>{p.project_name}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>
                            {formatLKR(p.amount)}
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
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              title="Download PDF Receipt"
                              onClick={() => generateReceiptPDF(rowReceiptData)}
                            >
                              <FileText size={14} color="#1a3c5e" /> PDF
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: '#25D366', color: 'white', border: 'none' }}
                              title="Send WhatsApp Message"
                              onClick={() => sendWhatsApp(rowReceiptData)}
                            >
                              <MessageCircle size={14} /> WhatsApp
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            title="Delete record"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 size={13} />
                          </button>
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
                    <div className="label">Total Amount</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="amount paid">{formatLKR(selectedProject.paid_amount)}</div>
                    <div className="label">Already Paid</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="amount remaining">
                      {formatLKR(selectedProject.remaining_amount)}
                    </div>
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
                      onChange={(e) => handleProjectChange(e.target.value)}
                    >
                      <option value="">Choose project...</option>
                      {projects.map((p) => (
                        <option key={p.project_id} value={p.project_id}>
                          {p.client_name} — {p.project_name} (Remaining:{' '}
                          {formatLKR(p.remaining_amount)})
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
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Date *</label>
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
                      placeholder="Optional payment notes..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
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
          <div className="modal" style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ padding: '36px 28px 24px' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle size={36} />
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                Payment Successfully Recorded!
              </h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
                Official PDF receipt has been generated and downloaded.
              </p>

              {/* Receipt Summary Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 18,
                  textAlign: 'left',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Client:</span>
                  <strong style={{ fontSize: 13, color: '#1e293b' }}>
                    {successReceipt.clientName}{' '}
                    {successReceipt.clientPhone ? `(${successReceipt.clientPhone})` : ''}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Project:</span>
                  <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                    {successReceipt.projectName}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    borderTop: '1px dashed #cbd5e1',
                    paddingTop: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: '#64748b' }}>Amount Paid:</span>
                  <strong style={{ fontSize: 15, color: '#16a34a' }}>
                    {formatLKR(successReceipt.amountPaid)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Total Contract Value:</span>
                  <span style={{ fontSize: 13, color: '#1e293b' }}>
                    {formatLKR(successReceipt.totalAmount)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #cbd5e1',
                    paddingTop: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    Remaining to Pay:
                  </span>
                  <strong
                    style={{
                      fontSize: 15,
                      color: Number(successReceipt.remainingAmount) <= 0 ? '#16a34a' : '#dc2626',
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
                    padding: 14,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                  onClick={() => sendWhatsApp(successReceipt)}
                >
                  <MessageCircle size={20} /> Send Receipt Details via WhatsApp
                </button>

                <button
                  className="btn btn-outline"
                  style={{ justifyContent: 'center', padding: 12 }}
                  onClick={() => generateReceiptPDF(successReceipt)}
                >
                  <Download size={16} /> Re-download PDF Receipt
                </button>

                <button
                  className="btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    justifyContent: 'center',
                    marginTop: 6,
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
