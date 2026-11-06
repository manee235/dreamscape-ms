import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  Search,
  Phone,
  User,
  FolderOpen,
  CreditCard,
  X,
  MessageCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { formatLKR, formatWhatsAppPhone, generateReceiptPDF } from '../utils/receiptGenerator'

export default function CustomerLookupModal({ isOpen, onClose, onMarkPayment }) {
  const [phoneQuery, setPhoneQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [matchedClient, setMatchedClient] = useState(null)
  const [clientProjects, setClientProjects] = useState([])
  const [clientPayments, setClientPayments] = useState([])
  const [suggestions, setSuggestions] = useState([])

  // Quick suggestions as user types
  useEffect(() => {
    if (!phoneQuery.trim()) {
      setSuggestions([])
      setMatchedClient(null)
      return
    }

    const searchClients = async () => {
      const q = phoneQuery.trim().replace(/[^\d+]/g, '')
      const { data } = await supabase
        .from('clients')
        .select('*')
        .ilike('phone', `%${q}%`)
        .limit(5)

      setSuggestions(data || [])

      // Exact match
      const exact = (data || []).find(
        (c) => c.phone.replace(/[^\d]/g, '') === q.replace(/[^\d]/g, '')
      )
      if (exact) {
        selectClient(exact)
      }
    }

    const timer = setTimeout(searchClients, 250)
    return () => clearTimeout(timer)
  }, [phoneQuery])

  const selectClient = async (client) => {
    setSearching(true)
    setMatchedClient(client)

    // Fetch this client's projects and payments
    const [projectsRes, paymentsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('client_id', client.id),
      supabase.from('payments').select('*').eq('client_id', client.id).order('payment_date', { ascending: false }),
    ])

    const prjs = projectsRes.data || []
    const pmts = paymentsRes.data || []

    // Calculate totals
    const enrichedProjects = prjs.map((p) => {
      const paid = pmts
        .filter((pm) => pm.project_id === p.id)
        .reduce((s, pm) => s + Number(pm.amount || 0), 0)
      const total = Number(p.total_amount || 0)
      return {
        ...p,
        paid_amount: paid,
        remaining_amount: Math.max(0, total - paid),
      }
    })

    setClientProjects(enrichedProjects)
    setClientPayments(pmts)
    setSearching(false)
  }

  const sendClientWhatsAppStatement = () => {
    if (!matchedClient || !matchedClient.phone) return
    const phone = formatWhatsAppPhone(matchedClient.phone)

    const totalContract = clientProjects.reduce((s, p) => s + Number(p.total_amount || 0), 0)
    const totalPaid = clientProjects.reduce((s, p) => s + Number(p.paid_amount || 0), 0)
    const totalRemaining = clientProjects.reduce((s, p) => s + Number(p.remaining_amount || 0), 0)

    const msg = `*DREAMSCAPE - HOUSE DESIGN & PLANNING*
*Official Account & Balance Statement*
---------------------------------------
Client: *${matchedClient.name}*
Phone: *${matchedClient.phone}*

📋 *ACTIVE PROJECTS (${clientProjects.length}):*
${clientProjects
  .map(
    (p, i) =>
      `${i + 1}. *${p.project_name}*
   • Total: ${formatLKR(p.total_amount)}
   • Paid: ${formatLKR(p.paid_amount)}
   • Balance Due: ${formatLKR(p.remaining_amount)}`
  )
  .join('\n\n')}

---------------------------------------
💰 *Total Contract Value:* ${formatLKR(totalContract)}
✅ *Total Paid to Date:* ${formatLKR(totalPaid)}
⚠️ *Total Balance Outstanding:* *${totalRemaining <= 0 ? '✓ Fully Settled' : formatLKR(totalRemaining)}*
---------------------------------------

Thank you for planning your dream home with Dreamscape!
📞 Contact: +94 77 123 4567`

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (!isOpen) return null

  const totalContract = clientProjects.reduce((s, p) => s + Number(p.total_amount || 0), 0)
  const totalPaid = clientProjects.reduce((s, p) => s + Number(p.paid_amount || 0), 0)
  const totalRemaining = Math.max(0, totalContract - totalPaid)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="glow-badge-icon emerald" style={{ width: 34, height: 34 }}>
              <Phone size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Client Mobile Lookup</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Search unique mobile number to view projects, payments &amp; remaining due
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 22 }}>
          {/* Search Input Box */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div className="top-search-box" style={{ background: 'var(--bg-input)', padding: '12px 18px' }}>
              <Phone size={18} color="var(--primary)" />
              <input
                type="text"
                placeholder="Enter client mobile number (e.g. 0771234567)..."
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                autoFocus
                style={{ fontSize: 15 }}
              />
              {phoneQuery && (
                <button
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => {
                    setPhoneQuery('')
                    setMatchedClient(null)
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {!matchedClient && suggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  marginTop: 6,
                  zIndex: 20,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}
              >
                {suggestions.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectClient(c)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.address || 'Client'}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                      {c.phone}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matched Customer Details View */}
          {matchedClient ? (
            <div>
              {/* Client Profile Header Capsule */}
              <div
                style={{
                  background: 'var(--bg-card-sub)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {matchedClient.name}
                    </h3>
                    <span className="badge badge-active" style={{ fontSize: 10 }}>Unique Verified</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    📞 {matchedClient.phone} {matchedClient.email ? `• ✉️ ${matchedClient.email}` : ''}
                  </div>
                </div>

                <button
                  className="btn btn-sm"
                  style={{ background: '#25D366', color: '#fff', border: 'none' }}
                  onClick={sendClientWhatsAppStatement}
                  title="Send Full Balance Statement to Client's WhatsApp"
                >
                  <MessageCircle size={14} /> Send WhatsApp Statement
                </button>
              </div>

              {/* Financial Snapshot: 3-Box Mini Summary */}
              <div className="payment-summary" style={{ marginBottom: 18 }}>
                <div className="payment-summary-item">
                  <div className="amount total">{formatLKR(totalContract)}</div>
                  <div className="label">Total Contracts</div>
                </div>
                <div className="payment-summary-item">
                  <div className="amount paid">{formatLKR(totalPaid)}</div>
                  <div className="label">Total Paid</div>
                </div>
                <div className="payment-summary-item">
                  <div className="amount remaining" style={{ color: totalRemaining <= 0 ? 'var(--primary)' : '#f43f5e' }}>
                    {totalRemaining <= 0 ? '✓ Fully Settled' : formatLKR(totalRemaining)}
                  </div>
                  <div className="label">Outstanding Due</div>
                </div>
              </div>

              {/* Client's Projects */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    House Design Projects ({clientProjects.length})
                  </strong>
                  {onMarkPayment && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        onClose()
                        onMarkPayment()
                      }}
                    >
                      <CreditCard size={13} /> Mark Payment
                    </button>
                  )}
                </div>

                {clientProjects.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No projects assigned yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {clientProjects.map((p) => {
                      const isPaid = Number(p.remaining_amount) <= 0
                      const pct = p.total_amount > 0 ? Math.min(100, (p.paid_amount / p.total_amount) * 100) : 0
                      return (
                        <div
                          key={p.id}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 12,
                            padding: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong>{p.project_name}</strong>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isPaid ? 'var(--primary)' : '#f43f5e' }}>
                              {isPaid ? '✓ Settled' : `Due: ${formatLKR(p.remaining_amount)}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>Total: {formatLKR(p.total_amount)}</span>
                            <span>Paid: {formatLKR(p.paid_amount)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Client's Payments History */}
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Payment History ({clientPayments.length})
                </strong>
                {clientPayments.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No payments recorded yet.</p>
                ) : (
                  <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {clientPayments.map((pm) => (
                      <div
                        key={pm.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--bg-card-sub)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--primary)' }}>{formatLKR(pm.amount)}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                            via {pm.payment_method}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(pm.payment_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
              <Phone size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>
                Type any client's mobile number above to view their live balance statement and payments.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

