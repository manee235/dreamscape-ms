// Dreamscape MS - Pricing by Square Feet Utility
// Standard rate per square foot configuration and calculation helpers

export const DEFAULT_RATE_PER_SQFT = 150

export function getStoredRatePerSqft() {
  try {
    const val = localStorage.getItem('dms_rate_per_sqft')
    if (val !== null && !isNaN(Number(val)) && Number(val) > 0) {
      return Number(val)
    }
  } catch {
    // fallback
  }
  return DEFAULT_RATE_PER_SQFT
}

export function setStoredRatePerSqft(rate) {
  try {
    const num = Number(rate)
    if (!isNaN(num) && num > 0) {
      localStorage.setItem('dms_rate_per_sqft', String(num))
      window.dispatchEvent(new CustomEvent('dms_rate_updated', { detail: { rate: num } }))
      return true
    }
  } catch {
    // fallback
  }
  return false
}

export function formatRatePerSqft(rate) {
  return 'Rs. ' + Number(rate || DEFAULT_RATE_PER_SQFT).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' / sq. ft.'
}

export function parseSqftFromDescription(desc = '') {
  if (!desc) return { sqft: '', rate: '', cleanDesc: '' }
  const match = desc.match(/\[Area:\s*([0-9,.]+)\s*sq\.ft(?:\s*@\s*Rs\.\s*([0-9,.]+)\/sq\.ft)?\]/i)
  if (match) {
    const sqft = match[1].replace(/,/g, '')
    const rate = match[2] ? match[2].replace(/,/g, '') : ''
    const cleanDesc = desc.replace(match[0], '').trim()
    return { sqft, rate, cleanDesc }
  }
  return { sqft: '', rate: '', cleanDesc: desc }
}

export function buildDescriptionWithSqft(desc = '', sqft = '', rate = '') {
  const clean = (desc || '').replace(/\[Area:[^\]]+\]/gi, '').trim()
  const sqftNum = parseFloat(sqft)
  if (!isNaN(sqftNum) && sqftNum > 0) {
    const rateNum = parseFloat(rate) || getStoredRatePerSqft()
    const tag = `[Area: ${sqftNum.toLocaleString('en-LK')} sq.ft @ Rs. ${rateNum.toFixed(2)}/sq.ft]`
    return clean ? `${clean}\n${tag}` : tag
  }
  return clean
}
