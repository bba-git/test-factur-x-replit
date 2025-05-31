import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger, safeLog, WORKFLOW } from '../logger';
import { generateZugferdXml } from '../../invoice/zugferd';

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

      logger.debug({ 
        workflow: WORKFLOW.PDF,
        paths: {
          tempPdf: tempPdfPath,
          tempJson: tempJsonPath,
          finalPdf: finalPdfPath
        }
      }, 'Generated temporary file paths');

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

      // Enforce RGB color space
      doc.fillColor('#000000'); // Set default fill color to black in RGB
      doc.strokeColor('#000000'); // Set default stroke color to black in RGB

      // Collect PDF data chunks
      doc.on('data', buffers.push.bind(buffers));
      
      // When PDF is done being written, save it
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          fs.writeFileSync(tempPdfPath, pdfBuffer);

          logger.debug({ 
            workflow: WORKFLOW.PDF,
            size: pdfBuffer.length
          }, 'Initial PDF generated');

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
            },
            xml: xmlContent
          };
          fs.writeFileSync(tempJsonPath, JSON.stringify(jsonData, null, 2));

          logger.debug({ 
            workflow: WORKFLOW.PDF,
            jsonSize: JSON.stringify(jsonData).length
          }, 'JSON data written');

          // Call Python script for PDF/A-3 conversion and XML embedding
          const scriptPath = path.join(__dirname, '..', '..', 'invoice', 'facturx_process.py');
          logger.debug({ 
            workflow: WORKFLOW.PDF,
            scriptPath,
            exists: fs.existsSync(scriptPath)
          }, 'Checking Python script');

          if (!fs.existsSync(scriptPath)) {
            logger.error({ 
              workflow: WORKFLOW.PDF,
              scriptPath
            }, 'Python script not found');
            throw new Error('Python script not found');
          }

          logger.debug({
            workflow: WORKFLOW.PDF,
            script: scriptPath,
            inputPdf: tempPdfPath,
            inputJson: tempJsonPath,
            outputPdf: finalPdfPath
          }, 'Executing Python script');

          const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${tempPdfPath} ${tempJsonPath} ${finalPdfPath}`);
          
          logger.debug({ 
            workflow: WORKFLOW.PDF,
            stdout
          }, 'Python script output');

          // Check if the script actually failed (non-zero exit code)
          if (stderr && !/(warning|deprecation|successfully processed)/i.test(stderr)) {
            logger.error({ 
              workflow: WORKFLOW.PDF,
              stderr
            }, 'Python script error');
            throw new Error('Python script execution failed: ' + stderr);
          } else if (stderr) {
            logger.debug({
              workflow: WORKFLOW.PDF,
              stderr
            }, 'Python script output');
          }

          // Check if output file exists
          if (!fs.existsSync(finalPdfPath)) {
            logger.error({ 
              workflow: WORKFLOW.PDF,
              finalPdfPath
            }, 'Output PDF file not found');
            throw new Error('Output PDF file not found');
          }

          // Read the final PDF
          logger.debug({ 
            workflow: WORKFLOW.PDF,
            finalPdfPath
          }, 'Reading final PDF');

          const finalPdfBuffer = fs.readFileSync(finalPdfPath);
          logger.debug({ 
            workflow: WORKFLOW.PDF,
            size: finalPdfBuffer.length
          }, 'Final PDF buffer size');

          // Clean up temp files
          logger.debug({ 
            workflow: WORKFLOW.PDF
          }, 'Cleaning up temp files');

          fs.unlinkSync(tempPdfPath);
          fs.unlinkSync(tempJsonPath);
          fs.unlinkSync(finalPdfPath);

          resolve(finalPdfBuffer);
        } catch (error) {
          logger.error({ 
            workflow: WORKFLOW.PDF,
            error
          }, 'Error in PDF processing');
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
      doc.font('Helvetica');
      let y = tableTop + 20;
      items.forEach((item, index) => {
        if (y > 700) { // Check if we need a new page
          doc.addPage();
          y = 50;
        }
        doc.text(item.description, descriptionX, y);
        doc.text(item.quantity.toString(), quantityX, y);
        doc.text(item.unit_price.toFixed(2), priceX, y);
        doc.text(item.vat_rate.toString(), vatRateX, y);
        doc.text(item.line_total.toFixed(2), amountX, y);
        y += 20;
      });

      // Draw line beneath the table
      doc.strokeColor('#aaaaaa').lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();

      // Totals
      doc.moveDown(2);
      doc.font('Helvetica-Bold');
      doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, 350);
      doc.text(`VAT Total: ${invoice.vat_total.toFixed(2)}`, 350);
      doc.text(`Total: ${invoice.total.toFixed(2)}`, 350);

      // Finalize PDF
      doc.end();
    } catch (error) {
      logger.error({ 
        workflow: WORKFLOW.PDF,
        error
      }, 'Error generating PDF');
      reject(error);
    }
  });
} 