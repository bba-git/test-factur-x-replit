/**
 * Factur-X Invoice Generator
 * 
 * This module integrates with our Python-based Factur-X generation process.
 * It follows the 5-step process:
 * 1. Convert regular PDF to PDF/A-3B using Ghostscript
 * 2. Generate Factur-X XML from invoice data
 * 3. Embed the XML into the PDF/A-3B file with AFRelationship = Data
 * 4. Add the XMP metadata to declare the Factur-X profile
 * 5. Validate the final PDF for compliance
 */

import { Invoice, InvoiceItem } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Create a Factur-X invoice from a regular PDF and invoice data
 * 
 * @param inputPdf Path to input PDF file
 * @param invoice Invoice data
 * @param items Invoice line items
 * @param outputPdf Path where the final PDF will be saved
 * @param profile Factur-X profile (default: EN16931)
 * @returns Promise resolving to boolean indicating success
 */
export async function createFacturXInvoice(
  inputPdf: string,
  invoice: Invoice,
  items: InvoiceItem[],
  outputPdf: string,
  profile: string = 'EN16931'
): Promise<boolean> {
  try {
    // Create a temporary JSON file with invoice data
    const tempDir = fs.mkdtempSync(path.join('/tmp', 'facturx-'));
    const jsonFile = path.join(tempDir, 'invoice.json');
    
    // Prepare invoice data in the format our Python script expects
    const invoiceData = {
      invoice: {
        number: invoice.invoiceNumber,
        date: invoice.issueDate?.toString() || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate?.toString() || '',
        currency: invoice.currency || 'EUR',
        comment: invoice.notes || 'Thank you for your business!',
        profile: profile
      },
      seller: {
        name: invoice.sellerName || '',
        address: invoice.sellerAddress || '',
        zip: invoice.sellerZip || '',
        city: invoice.sellerCity || '',
        country: invoice.sellerCountry || '',
        taxID: invoice.sellerTaxId || '',
        email: invoice.sellerEmail || ''
      },
      buyer: {
        name: invoice.buyerName || '',
        address: invoice.buyerAddress || '',
        zip: invoice.buyerZip || '',
        city: invoice.buyerCity || '',
        country: invoice.buyerCountry || '',
        taxID: invoice.buyerTaxId || '',
        email: invoice.buyerEmail || ''
      },
      items: items.map(item => ({
        name: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'pcs',
        unitPrice: item.unitPrice || 0,
        vatPercent: item.vatRate || 20,
        note: item.notes || ''
      })),
      totals: {
        netAmount: invoice.netAmount || 0,
        vatAmount: invoice.vatAmount || 0,
        grandTotal: invoice.totalAmount || 0
      },
      payment: {
        iban: invoice.paymentIban || '',
        bic: invoice.paymentBic || '',
        reference: invoice.invoiceNumber
      }
    };
    
    // Write JSON file
    fs.writeFileSync(jsonFile, JSON.stringify(invoiceData, null, 2));
    
    // Run the Python process
    console.log(`Running Factur-X process for invoice ${invoice.invoiceNumber}...`);
    
    const { stdout, stderr } = await execPromise(
      `python facturx_process.py ${inputPdf} ${jsonFile} ${outputPdf} ${profile}`
    );
    
    console.log('Python process output:', stdout);
    
    if (stderr) {
      console.error('Python process errors:', stderr);
    }
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    // Check if output file exists
    if (fs.existsSync(outputPdf)) {
      console.log(`Successfully created Factur-X invoice: ${outputPdf}`);
      return true;
    } else {
      console.error(`Failed to create Factur-X invoice: Output file not found`);
      return false;
    }
    
  } catch (error) {
    console.error('Error creating Factur-X invoice:', error);
    return false;
  }
}