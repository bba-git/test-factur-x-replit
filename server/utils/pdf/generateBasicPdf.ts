import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem } from '@shared/schema';

export async function generateBasicPdf(invoice: Invoice, items: InvoiceItem[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoice_number}`,
          Author: 'Invoice Generator',
          Subject: 'Invoice',
          Keywords: 'invoice',
          CreationDate: new Date(),
        }
      });

      // Collect PDF data chunks
      doc.on('data', buffers.push.bind(buffers));
      
      // When PDF is done being written, resolve with the buffer
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Invoice details
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number}`);
      doc.text(`Issue Date: ${invoice.issue_date}`);
      doc.text(`Due Date: ${invoice.due_date}`);
      doc.moveDown();

      // Line items
      doc.fontSize(14).text('Items:');
      doc.moveDown();

      // Table header
      const tableTop = doc.y + 20;
      const descriptionX = 50;
      const quantityX = 280;
      const priceX = 350;
      const vatRateX = 420;
      const amountX = 480;

      // Table headers
      doc.font('Helvetica-Bold');
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qty', quantityX, tableTop);
      doc.text('Unit Price', priceX, tableTop);
      doc.text('VAT%', vatRateX, tableTop);
      doc.text('Amount', amountX, tableTop);
      doc.moveDown();

      // Table content
      doc.font('Helvetica');
      
      // Draw items
      items.forEach(item => {
        const y = doc.y;
        
        doc.text(item.description, descriptionX, y, { width: 200 });
        doc.text(item.quantity.toString(), quantityX, y);
        doc.text(`${item.unit_price.toFixed(2)} ${invoice.currency}`, priceX, y);
        doc.text(`${item.vat_rate}%`, vatRateX, y);
        doc.text(`${item.line_total.toFixed(2)} ${invoice.currency}`, amountX, y);
        
        doc.moveDown(1.5);
      });

      // Draw line beneath the table
      doc.strokeColor('#aaaaaa').lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      doc.moveDown();

      // Summary
      const summaryX = 350;
      doc.text('Subtotal:', summaryX);
      doc.text(`${invoice.subtotal.toFixed(2)} ${invoice.currency}`, amountX);
      doc.moveDown(0.5);
      
      doc.text('VAT:', summaryX);
      doc.text(`${invoice.vat_total.toFixed(2)} ${invoice.currency}`, amountX);
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold');
      doc.text('Total:', summaryX);
      doc.text(`${invoice.total.toFixed(2)} ${invoice.currency}`, amountX);
      doc.font('Helvetica');
      doc.moveDown(2);

      // Additional information
      if (invoice.payment_terms) {
        doc.fontSize(12).text(`Payment Terms: ${invoice.payment_terms}`);
      }
      if (invoice.purchase_order_ref) {
        doc.text(`Reference: ${invoice.purchase_order_ref}`);
      }
      doc.moveDown();

      // Notes
      if (invoice.notes) {
        doc.fontSize(12).text('Notes:');
        doc.fontSize(10).text(invoice.notes);
      }

      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
} 