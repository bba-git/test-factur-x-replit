import { Invoice, InvoiceItem } from "@shared/schema";
import { storage } from "../storage";
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLib, StandardFonts } from "pdf-lib";
import { Buffer } from "buffer";
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Function to generate PDF/A-3 compliant invoice with embedded XML
export async function generatePdf(invoice: Invoice, items: InvoiceItem[], xmlContent: string): Promise<Buffer> {
  console.log('[PDF] Starting PDF generation process');
  console.log('[PDF] Invoice data:', JSON.stringify(invoice, null, 2));
  console.log('[PDF] Items data:', JSON.stringify(items, null, 2));

  try {
    // Fetch related data
    const customer = await storage.getCustomer(invoice.customerId);
    const companyProfile = await storage.getCompanyProfile(invoice.companyProfileId);

    if (!customer || !companyProfile) {
      throw new Error("Customer or company profile not found");
    }

    // Step 1: Generate the invoice PDF using PDFKit
    console.log('[PDF] Step 1: Generating initial PDF with PDFKit');
    const pdfBuffer = await createInvoicePdf(invoice, items, customer, companyProfile);
    console.log('[PDF] Initial PDF buffer size:', pdfBuffer.length, 'bytes');
    
    // Step 2: Convert to PDF/A-3 and embed XML using pdf-lib
    console.log('[PDF] Step 2: Converting to PDF/A-3 and embedding XML');
    const pdfA3Buffer = await convertToPdfA3AndEmbedXml(pdfBuffer, xmlContent, invoice);
    
    return pdfA3Buffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF: " + error);
  }
}

// Function to create the invoice PDF using PDFKit
async function createInvoicePdf(
  invoice: Invoice, 
  items: InvoiceItem[], 
  customer: any, 
  companyProfile: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoice_number}`,
          Author: companyProfile.name,
          Subject: `Invoice for ${customer.name}`,
          Keywords: 'invoice, factur-x, zugferd',
          CreationDate: new Date(),
        }
      });

      // Collect PDF data chunks
      doc.on('data', buffers.push.bind(buffers));
      
      // When PDF is done being written, resolve with the buffer
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('[PDF] PDFKit document generation completed');
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

      // Company information
      doc.fontSize(14).text('From:');
      doc.fontSize(12).text(companyProfile.name);
      doc.text(companyProfile.address);
      doc.text(`${companyProfile.city}, ${companyProfile.postalCode}`);
      doc.text(companyProfile.country);
      doc.text(`VAT: ${companyProfile.vatNumber}`);
      doc.moveDown();

      // Customer information
      doc.fontSize(14).text('To:');
      doc.fontSize(12).text(customer.name);
      doc.text(customer.address);
      doc.text(`${customer.city}, ${customer.postalCode}`);
      doc.text(customer.country);
      if (customer.vatNumber) {
        doc.text(`VAT: ${customer.vatNumber}`);
      }
      doc.moveDown(2);

      // Line items
      doc.fontSize(14).text('Items:');
      doc.moveDown();

      // Table header
      const invoiceTop = doc.y;
      doc.fontSize(10);
      
      // Define table columns
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
        doc.text(`${(item.quantity * item.unit_price).toFixed(2)} ${invoice.currency}`, amountX, y);
        
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
      doc.text(`${invoice.vatTotal.toFixed(2)} ${invoice.currency}`, amountX);
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold');
      doc.text('Total:', summaryX);
      doc.text(`${invoice.total.toFixed(2)} ${invoice.currency}`, amountX);
      doc.font('Helvetica');
      doc.moveDown(2);

      // Additional information
      doc.fontSize(12).text(`Payment Terms: ${invoice.paymentTerms || 'N/A'}`);
      if (invoice.purchaseOrderRef) {
        doc.text(`Reference: ${invoice.purchaseOrderRef}`);
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

// Function to convert PDF to PDF/A-3B and embed XML
async function convertToPdfA3AndEmbedXml(
  pdfBuffer: Buffer,
  xmlContent: string,
  invoice: Invoice
): Promise<Buffer> {
  try {
    // Import our Factur-X generator module
    const { createFacturXInvoice } = await import('./facturx');
    
    // First, write the PDF to a temporary file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      console.log('[PDF] Creating temp directory:', tempDir);
      fs.mkdirSync(tempDir);
    }

    const tempPdfPath = path.join(tempDir, `${invoice.invoice_number}.pdf`);
    const tempJsonPath = path.join(tempDir, `${invoice.invoice_number}.json`);
    const finalPdfPath = path.join(tempDir, `${invoice.invoice_number}_final.pdf`);

    console.log('[PDF] Writing initial PDF to temp file:', tempPdfPath);
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Create JSON file for Factur-X
    console.log('[PDF] Creating JSON file for Factur-X:', tempJsonPath);
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
    console.log('[PDF] Calling Python script for PDF/A-3 conversion');
    try {
      const scriptPath = path.join(__dirname, 'facturx_process.py');
      console.log('[PDF] Python script path:', scriptPath);
      console.log('[PDF] Checking if script exists:', fs.existsSync(scriptPath));

      const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${tempPdfPath} ${tempJsonPath} ${finalPdfPath}`);
      console.log('[PDF] Python script stdout:', stdout);
      if (stderr) console.error('[PDF] Python script stderr:', stderr);

      // Read the final PDF
      console.log('[PDF] Reading final PDF from:', finalPdfPath);
      const finalPdfBuffer = fs.readFileSync(finalPdfPath);
      console.log('[PDF] Final PDF buffer size:', finalPdfBuffer.length, 'bytes');

      // Clean up temp files
      console.log('[PDF] Cleaning up temp files');
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(tempJsonPath);
      fs.unlinkSync(finalPdfPath);

      return finalPdfBuffer;
    } catch (error) {
      console.error('[PDF] Error in PDF/A-3 conversion:', error);
      // If conversion fails, return the original PDF
      console.log('[PDF] Returning original PDF due to conversion failure');
      return pdfBuffer;
    }
  } catch (error) {
    console.error('Error creating Factur-X PDF:', error);
    throw new Error('Failed to create Factur-X PDF');
  }
}
