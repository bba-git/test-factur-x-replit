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
import { storage } from '../storage';

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
    
    // Fetch required data
    const customer = await storage.getCustomer(invoice.customerId);
    const companyProfile = await storage.getCompanyProfile(invoice.companyProfileId);
    
    if (!customer || !companyProfile) {
      throw new Error("Customer or company profile not found");
    }
    
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
        name: companyProfile.name || '',
        address: companyProfile.address || '',
        zip: companyProfile.postalCode || '',
        city: companyProfile.city || '',
        country: companyProfile.country || '',
        taxID: companyProfile.vatNumber || '',
        email: companyProfile.email || ''
      },
      buyer: {
        name: customer.name || '',
        address: customer.address || '',
        zip: customer.postalCode || '',
        city: customer.city || '',
        country: customer.country || '',
        taxID: customer.vatNumber || '',
        email: customer.email || ''
      },
      items: items.map(item => ({
        name: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unitOfMeasure || 'pcs',
        unitPrice: item.unitPrice || 0,
        vatPercent: item.vatRate || 20,
        note: ''
      })),
      totals: {
        netAmount: invoice.subtotal || 0,
        vatAmount: invoice.vatTotal || 0,
        grandTotal: invoice.total || 0
      },
      payment: {
        iban: '',
        bic: '',
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