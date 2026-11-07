import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Official Dreamscape logo embedded as high-res PNG data URI for offline PDF rendering
const DREAMSCAPE_LOGO_PNG =
  'data:image/png;base64,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fUhtQoOMCioB4eMv1wUzxlmwuUbyfP99TLWi9YnlDB+r55klwme6hlhH1Nc2HDHNGzp3bwzhM11862LSCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAm+ctpRFMW2KIoPPZ2Ivp4XE0flA8AE4QPABOEDwAThA8AE4QPABOEDwAThA8AE4QPABOEDwAThA8AE4QPABOEDwAThA8AE4QPABOEDwAThA8AE4QPABOEDwAThA8AE4QPABOEDwAThA8AEt86Ztl3L0R94vZgCwmfaVrxeTBXNLgAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmCB8AJggfACYIHwAmuHXO8D7M7QWP0Jb3wR6VDwAThA8AE4QPABNVn89aHnBbcn7gacuJ6laFz6IoivuxHygwIVxPHmh2ATBB+AAwQfgAMFH1+RyKothx+oFgXDuxiqL4P0tck3hdU/HRAAAAAElFTkSuQmCC';

// Format numbers into Sri Lankan currency display
export function formatLKR(amount) {
  return 'Rs. ' + Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Format Sri Lankan phone numbers for WhatsApp (07XXXXXXXX -> 947XXXXXXXX)
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  } else if (!cleaned.startsWith('94') && cleaned.length === 9) {
    cleaned = '94' + cleaned;
  }
  return cleaned;
}

// Generate WhatsApp message text
export function generateWhatsAppMessage({
  receiptNo,
  clientName,
  projectName,
  projectType,
  amountPaid,
  totalAmount,
  totalPaid,
  remainingAmount,
  paymentDate,
  paymentMethod,
  referenceNumber,
}) {
  const refText = referenceNumber ? ` (Ref: ${referenceNumber})` : '';

  return `*DREAMSCAPE - HOUSE DESIGN & PLANNING AGENCY*
*Official Payment Receipt*
---------------------------------------------
Dear *${clientName || 'Valued Client'}*,

Thank you for your payment! Here are the details of your transaction:

📋 *Receipt No:* ${receiptNo || 'RCP-TXN'}
🏠 *Project:* ${projectName || 'House Design'}
🏷️ *Type:* ${projectType || 'House Design & Planning'}
📅 *Date:* ${paymentDate}
💳 *Amount Received:* *${formatLKR(amountPaid)}*
💵 *Payment Method:* ${paymentMethod}${refText}

---------------------------------------------
📊 *PAYMENT PROGRESS SUMMARY*
• *Total Project Value:* ${formatLKR(totalAmount)}
• *Total Paid to Date:* ${formatLKR(totalPaid)}
• *Remaining Balance Due:* *${Number(remainingAmount) <= 0 ? '✓ Fully Settled (Rs. 0.00)' : formatLKR(remainingAmount)}*
---------------------------------------------

📄 Your official PDF payment receipt has been issued.
Thank you for choosing *Dreamscape* to design your dream home!

*Dreamscape Management System*
📞 Inquiries: 0779962051`;
}

// Build professional receipt PDF jsPDF document & File object
export function buildReceiptPDFDoc({
  receiptNo,
  clientName,
  clientPhone,
  clientEmail,
  projectName,
  projectType,
  amountPaid,
  totalAmount,
  totalPaid,
  remainingAmount,
  paymentDate,
  paymentMethod,
  referenceNumber,
  notes,
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background banner (Solid Dark Obsidian)
  doc.setFillColor(14, 20, 29); // #0e141d
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent mint green solid decorative line
  doc.setFillColor(0, 210, 147); // #00d293 solid mint
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Brand Logo Badge Container with solid emerald accent
  doc.setFillColor(22, 31, 44);
  doc.setDrawColor(0, 210, 147);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 8, 25, 25, 3, 3, 'FD');

  // Embed the official architectural arches logo inside the badge
  try {
    doc.addImage(DREAMSCAPE_LOGO_PNG, 'PNG', 16.5, 12.2, 20, 15.54);
  } catch (err) {
    console.warn('Failed to render PDF logo:', err);
  }

  // Agency branding in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DREAMSCAPE', 43, 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 210, 147);
  doc.text('HOUSE DESIGN & PLANNING AGENCY', 43, 23.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('252/2 Kanduboda, Bamunakotuwa | Tel: 0779962051', 43, 29);

  // Receipt title on the right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PAYMENT RECEIPT', pageWidth - 14, 18, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const safeReceiptNo = receiptNo || 'RCP-' + Math.floor(100000 + Math.random() * 900000);
  doc.text(`Receipt #: ${safeReceiptNo}`, pageWidth - 14, 25, { align: 'right' });
  doc.text(`Date: ${paymentDate || new Date().toISOString().split('T')[0]}`, pageWidth - 14, 32, { align: 'right' });

  // Client & Project Information cards
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 88, 38, 3, 3, 'FD');
  doc.roundedRect(pageWidth - 102, 52, 88, 38, 3, 3, 'FD');

  // Client Details Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL TO (CLIENT)', 20, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(14, 20, 29);
  doc.text(clientName || 'Valued Client', 20, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Phone: ${clientPhone || '—'}`, 20, 75);
  doc.text(`Email: ${clientEmail || '—'}`, 20, 82);

  // Project Details Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PROJECT DETAILS', pageWidth - 96, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(14, 20, 29);
  doc.text(doc.splitTextToSize(projectName || 'House Design Project', 76), pageWidth - 96, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Type: ${projectType || 'House Design & Planning'}`, pageWidth - 96, 78);
  doc.text(`Status: Active Milestone`, pageWidth - 96, 84);

  // Payment Breakdown Table
  const tableData = [
    ['Contract / Plan Total', formatLKR(totalAmount), 'Agreed architectural fee'],
    ['Amount Received in this Transaction', formatLKR(amountPaid), `${paymentMethod || 'Cash'}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}`],
    ['Total Paid to Date (Cumulative)', formatLKR(totalPaid), 'Includes all settled milestone payments'],
    ['Remaining Outstanding Balance', formatLKR(remainingAmount), Number(remainingAmount) <= 0 ? '✓ FULLY SETTLED' : 'Due on next milestone'],
  ];

  autoTable(doc, {
    startY: 98,
    margin: { left: 14, right: 14 },
    head: [['Description', 'Amount (LKR)', 'Details']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 20, 29],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 4.5,
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: [0, 150, 105] },
      2: { cellWidth: 'auto', textColor: [100, 116, 139] },
    },
    didParseCell: (data) => {
      if (data.row.index === 3 && data.column.index === 1) {
        data.cell.styles.textColor = Number(remainingAmount) <= 0 ? [0, 150, 105] : [225, 29, 72];
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY || 155;

  // Amount In Words / Summary box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, finalY + 8, pageWidth - 28, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 20, 29);
  doc.text('Payment Confirmation:', 20, finalY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Amount of ${formatLKR(amountPaid)} received on ${paymentDate}. Outstanding balance is ${formatLKR(remainingAmount)}.`, 62, finalY + 16);

  if (notes) {
    const notesY = finalY + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Notes / Instructions:', 14, notesY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(doc.splitTextToSize(notes, pageWidth - 28), 14, notesY + 5);
  }

  // Signature section
  const sigY = 245;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 70, sigY);
  doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signature (Dreamscape)', 14, sigY + 5);
  doc.text('Client Signature & Date', pageWidth - 14, sigY + 5, { align: 'right' });

  // Footer banner
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 275, pageWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(14, 20, 29);
  doc.text('Dreamscape House Design & Planning Agency', pageWidth / 2, 282, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated official payment receipt. Valid without physical stamp.', pageWidth / 2, 287, { align: 'center' });

  const filename = `Receipt_${(clientName || 'Client').replace(/\s+/g, '_')}_${paymentDate || 'payment'}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { doc, filename, blob, file };
}

// Generate and trigger download of receipt PDF
export function generateReceiptPDF(receiptData) {
  const { doc, filename } = buildReceiptPDFDoc(receiptData);
  doc.save(filename);
  return doc;
}

// Print receipt PDF directly via browser print dialog
export function printReceiptPDF(receiptData) {
  const { doc } = buildReceiptPDFDoc(receiptData);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    try {
      printWindow.focus();
    } catch {}
  }
  return doc;
}

// Share receipt PDF directly via WhatsApp
// Uses native Web Share API with PDF file attachment when supported (mobile phones),
// and falls back to opening WhatsApp chat with the invoice text while auto-downloading the PDF file on desktop.
export async function shareReceiptViaWhatsApp(receiptData, autoDownload = true) {
  const { doc, file, filename } = buildReceiptPDFDoc(receiptData);
  const msg = generateWhatsAppMessage(receiptData);
  const phone = formatWhatsAppPhone(receiptData.clientPhone);

  // 1. Try native Web Share with PDF File attachment (supported on iOS Safari, Android Chrome)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Payment Receipt - ${receiptData.clientName}`,
        text: msg,
      });
      return { success: true, method: 'native_share', filename };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'cancelled', filename };
      }
      console.warn('Web Share failed, using URL fallback:', err);
    }
  }

  // 2. Desktop / standard web fallback:
  // Auto-download the PDF so user has the physical file ready to attach
  if (autoDownload) {
    try {
      doc.save(filename);
    } catch (e) {
      console.warn('PDF auto-download error:', e);
    }
  }

  // Open WhatsApp Web / App with client's phone pre-filled
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

  window.open(url, '_blank');
  return { success: true, method: 'whatsapp_url', filename };
}
