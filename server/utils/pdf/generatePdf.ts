import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generatePdf(invoice: Invoice, items: InvoiceItem[], xmlContent: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create temporary directory
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const tempPdfPath = path.join(tempDir, `${invoice.invoice_number}.pdf`);
      const tempJsonPath = path.join(tempDir, `${invoice.invoice_number}.json`);
      const finalPdfPath = path.join(tempDir, `${invoice.invoice_number}_final.pdf`);

      // Generate initial PDF
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoice_number}`,
          Author: 'Factur-X Generator',
          Subject: 'Invoice',
          Keywords: 'invoice, factur-x',
          CreationDate: new Date(),
        }
      });

      // Collect PDF data chunks
      doc.on('data', buffers.push.bind(buffers));
      
      // When PDF is done being written, save it
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          fs.writeFileSync(tempPdfPath, pdfBuffer);

          // Create JSON file for Factur-X
          const jsonData = {
            invoice: {
              number: invoice.invoice_number,
              date: invoice.issue_date,
              dueDate: invoice.due_date,
              currency: invoice.currency,
              total: invoice.total,
              items: items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                vatRate: item.vat_rate,
                lineTotal: item.line_total
              }))
            }
          };
          fs.writeFileSync(tempJsonPath, JSON.stringify(jsonData, null, 2));

          // Call Python script for PDF/A-3 conversion and XML embedding
          const scriptPath = path.join(__dirname, 'facturx_process.py');
          const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${tempPdfPath} ${tempJsonPath} ${finalPdfPath}`);
          
          if (stderr) {
            console.error('[PDF] Python script stderr:', stderr);
          }

          // Read the final PDF
          const finalPdfBuffer = fs.readFileSync(finalPdfPath);

          // Clean up temp files
          fs.unlinkSync(tempPdfPath);
          fs.unlinkSync(tempJsonPath);
          fs.unlinkSync(finalPdfPath);

          resolve(finalPdfBuffer);
        } catch (error) {
          console.error('Error in PDF processing:', error);
          reject(error);
        }
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
      let tableY = doc.y;
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

      // Footer
      const footerY = doc.page.height - 50;
      doc.fontSize(10)
        .text(
          `Invoice created with Factur-X/ZUGFeRD (${invoice.profile}) compliance`,
          50,
          footerY,
          { align: 'center' }
        );

      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
} 