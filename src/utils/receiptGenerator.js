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

📋 *Project:* ${projectName || 'House Design'}
🏷️ *Type:* ${projectType || 'House Design & Planning'}
📅 *Date:* ${paymentDate}
💳 *Amount Paid:* *${formatLKR(amountPaid)}*
💵 *Payment Method:* ${paymentMethod}${refText}

---------------------------------------------
📊 *PAYMENT SUMMARY*
• *Total Project Value:* ${formatLKR(totalAmount)}
• *Total Paid to Date:* ${formatLKR(totalPaid)}
• *Remaining Outstanding:* *${Number(remainingAmount) <= 0 ? 'Fully Paid (Rs. 0.00)' : formatLKR(remainingAmount)}*
---------------------------------------------

📄 Your official payment receipt PDF has been generated.
Thank you for choosing *Dreamscape* to design your dream home!

*Dreamscape Management System*
📞 Inquiries: +94 77 123 4567`;
}

// Generate and trigger download of professional receipt PDF
export function generateReceiptPDF({
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

  // Header background banner
  doc.setFillColor(26, 60, 94); // #1a3c5e primary navy
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent gold decorative line
  doc.setFillColor(212, 168, 85); // #d4a855 accent gold
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Agency branding header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DREAMSCAPE', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(212, 168, 85);
  doc.text('HOUSE DESIGN & PLANNING AGENCY', 14, 25);

  doc.setTextColor(220, 225, 235);
  doc.setFontSize(8.5);
  doc.text('Architectural Design | House Planning | Interior Concepts', 14, 32);

  // Receipt meta (Right-aligned in header)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL RECEIPT', pageWidth - 14, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 168, 85);
  doc.text(`Receipt #: ${receiptNo || 'RCP-' + Date.now().toString().slice(-6)}`, pageWidth - 14, 24, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.text(`Date: ${paymentDate}`, pageWidth - 14, 31, { align: 'right' });

  // Reset text color
  doc.setTextColor(30, 41, 59);

  // Client Details Box (Left)
  const boxY = 52;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, boxY, 86, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, 86, 38, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 60, 94);
  doc.text('BILLED TO (CLIENT):', 18, boxY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(clientName || 'N/A', 18, boxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (clientPhone) doc.text(`Phone: ${clientPhone}`, 18, boxY + 21);
  if (clientEmail) doc.text(`Email: ${clientEmail}`, 18, boxY + 27);

  // Project Details Box (Right)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, boxY, 88, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, boxY, 88, 38, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 60, 94);
  doc.text('PROJECT DETAILS:', 112, boxY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(projectName || 'House Design Project', 112, boxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Type: ${projectType || 'House Design & Planning'}`, 112, boxY + 21);
  if (referenceNumber) doc.text(`Ref/Chq #: ${referenceNumber}`, 112, boxY + 27);
  doc.text(`Method: ${paymentMethod || 'Cash'}`, 112, boxY + 33);

  // Payment Breakdown Table
  autoTable(doc, {
    startY: 97,
    theme: 'grid',
    head: [['Description / Item', 'Details', 'Amount (LKR)']],
    body: [
      ['Total Project Contract Value', projectName, formatLKR(totalAmount)],
      ['Current Payment Received', `Paid via ${paymentMethod} on ${paymentDate}`, formatLKR(amountPaid)],
      ['Total Amount Paid to Date', 'Cumulative payments', formatLKR(totalPaid)],
      [
        'REMAINING OUTSTANDING BALANCE',
        Number(remainingAmount) <= 0 ? '✓ Fully Settled' : 'Payable by Client',
        formatLKR(remainingAmount),
      ],
    ],
    headStyles: {
      fillColor: [26, 60, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 65, textColor: [100, 116, 139] },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 47 },
    },
    didParseCell: function (data) {
      if (data.row.index === 1 && data.section === 'body') {
        data.cell.styles.textColor = [22, 163, 74]; // green for current payment
      }
      if (data.row.index === 3 && data.section === 'body') {
        data.cell.styles.fillColor = [254, 242, 242]; // light red / highlight
        data.cell.styles.textColor = Number(remainingAmount) <= 0 ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Highlight Box for Payment Confirmation
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFillColor(240, 253, 244); // light green
  doc.roundedRect(14, finalY, pageWidth - 28, 22, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, finalY, pageWidth - 28, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text('Payment Successfully Received', 20, finalY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Amount of ${formatLKR(amountPaid)} received on ${paymentDate}. Outstanding balance is ${formatLKR(remainingAmount)}.`, 20, finalY + 15);

  if (notes) {
    const notesY = finalY + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Notes / Instructions:', 14, notesY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(notes, 14, notesY + 5);
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
  doc.setTextColor(26, 60, 94);
  doc.text('Dreamscape House Design & Planning Agency', pageWidth / 2, 282, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated official payment receipt. Valid without physical stamp.', pageWidth / 2, 287, { align: 'center' });

  // Save the PDF
  const filename = `Receipt_${(clientName || 'Client').replace(/\s+/g, '_')}_${paymentDate}.pdf`;
  doc.save(filename);

  return doc;
}
