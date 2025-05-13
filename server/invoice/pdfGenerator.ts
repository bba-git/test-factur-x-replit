import { Invoice, InvoiceItem } from "@shared/schema";
import { storage } from "../storage";
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLib, StandardFonts } from "pdf-lib";
import { Buffer } from "buffer";

// Function to generate PDF/A-3 compliant invoice with embedded XML
export async function generatePdf(invoice: Invoice, items: InvoiceItem[], xmlContent: string): Promise<Buffer> {
  try {
    // Fetch related data
    const customer = await storage.getCustomer(invoice.customerId);
    const companyProfile = await storage.getCompanyProfile(invoice.companyProfileId);

    if (!customer || !companyProfile) {
      throw new Error("Customer or company profile not found");
    }

    // Step 1: Generate the invoice PDF using PDFKit
    const pdfBuffer = await createInvoicePdf(invoice, items, customer, companyProfile);
    
    // Step 2: Convert to PDF/A-3 and embed XML using pdf-lib
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
          Title: `Invoice ${invoice.invoiceNumber}`,
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
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Invoice details
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Issue Date: ${invoice.issueDate}`);
      doc.text(`Due Date: ${invoice.dueDate}`);
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
        doc.text(`${item.unitPrice.toFixed(2)} ${invoice.currency}`, priceX, y);
        doc.text(`${item.vatRate}%`, vatRateX, y);
        doc.text(`${(item.quantity * item.unitPrice).toFixed(2)} ${invoice.currency}`, amountX, y);
        
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
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    // Create temp directory and files
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-'));
    const inputPdfPath = path.join(tempDir, 'invoice.pdf');
    const outputPdfPath = path.join(tempDir, 'facturx-invoice.pdf');
    const xmlPath = path.join(tempDir, 'invoice.xml');
    
    // Write files
    fs.writeFileSync(inputPdfPath, pdfBuffer);
    fs.writeFileSync(xmlPath, xmlContent);
    
    // Fetch invoice items
    const items = await storage.getInvoiceItems(invoice.id);
    
    // Generate Factur-X PDF using our Python script
    await createFacturXInvoice(
      inputPdfPath,
      invoice,
      items,
      outputPdfPath,
      invoice.profile || 'EN16931'
    );
    
    // Read the resulting PDF
    let resultBuffer: Buffer;
    
    if (fs.existsSync(outputPdfPath)) {
      // If our Factur-X process succeeded, use the output
      resultBuffer = fs.readFileSync(outputPdfPath);
      console.log(`Successfully created Factur-X invoice for ${invoice.invoiceNumber}`);
    } else {
      // Fallback to the original PDF if process failed
      console.warn(`Factur-X process failed, using original PDF for ${invoice.invoiceNumber}`);
      
      // Load the PDF document with pdf-lib as a simple fallback
      const pdfDoc = await PDFLib.load(pdfBuffer);
      
      // Set basic metadata
      pdfDoc.setTitle(`Invoice ${invoice.invoiceNumber}`);
      pdfDoc.setAuthor('InvoiceX');
      pdfDoc.setSubject('Invoice');
      pdfDoc.setCreationDate(new Date());
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      resultBuffer = Buffer.from(pdfBytes);
    }
    
    // Clean up temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }
    
    return resultBuffer;
  } catch (error) {
    console.error('Error creating Factur-X PDF:', error);
    throw new Error('Failed to create Factur-X PDF');
  }
}
