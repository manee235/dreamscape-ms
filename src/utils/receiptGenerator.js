import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
📞 Inquiries: +94 77 123 4567`;
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

  // Agency branding in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DREAMSCAPE', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 210, 147);
  doc.text('HOUSE DESIGN & PLANNING AGENCY', 14, 25);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('No 45, Architectural Ave, Colombo 07 | Tel: +94 77 123 4567 | info@dreamscape.lk', 14, 32);

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
