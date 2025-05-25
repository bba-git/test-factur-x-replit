import express from 'express';
import { supabase } from '../supabaseClient';
import { getAuthenticatedUser } from '../middleware/getAuthenticatedUser';
import { insertAndReturn } from '../utils/supabase/insertAndReturn';
import { Request, Response } from 'express';
import { generatePdf } from '../utils/pdf/generatePdf';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit_of_measure: string;
  line_total: number;
}

interface InvoiceDB {
  id: string;
  invoice_number: string;
  customer_id: string;
  company_profile_id: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  notes: string | null;
  payment_terms: string | null;
  purchase_order_ref: string | null;
  status: string;
  profile: string;
  created_at?: Date;
  updated_at?: Date;
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(getAuthenticatedUser);

// Get all invoices for the company
router.get('/', async (req, res) => {
  const { companyProfileId } = req.context!;
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_profile_id', companyProfileId);

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// Create an invoice
router.post('/', async (req: Request, res: Response) => {
  console.log('[INVOICE][SERVER] Incoming request body:', req.body);
  console.log('[INVOICE][SERVER] Session context:', req.context);

  try {
    // Early validation
    if (!req.context?.companyProfileId) {
      console.error('[INVOICE][SERVER] Missing company context');
      return res.status(401).json({ message: 'Missing company context' });
    }

    if (!req.body.customer_id) {
      console.error('[INVOICE][SERVER] Missing customer ID');
      return res.status(400).json({ message: 'Missing customer ID' });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      console.error('[INVOICE][SERVER] No items in invoice');
      return res.status(400).json({ message: 'Invoice must contain at least one item' });
    }

    // Verify customer belongs to the same company
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', req.body.customer_id)
      .eq('company_profile_id', req.context.companyProfileId)
      .single();

    if (!customer || customerError) {
      console.error('[INVOICE][SERVER] Customer validation failed', {
        customerError,
        customer_id: req.body.customer_id,
        company_profile_id: req.context.companyProfileId
      });
      return res.status(403).json({ message: "Invalid customer or customer does not belong to your company" });
    }

    console.log('[INVOICE][SERVER] Validated customer ownership');

    // Extract items from the request body
    const { items, ...invoiceData } = req.body;

    // Prepare the invoice insert payload
    const invoicePayload = {
      ...invoiceData,
      company_profile_id: req.context.companyProfileId,
      status: 'DRAFT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[INVOICE][SERVER] Preparing invoice insert payload:', invoicePayload);

    try {
      // Insert the invoice first
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .single();

      if (invoiceError) {
        console.error('[INVOICE][SERVER] Supabase invoice insert error:', invoiceError);
        return res.status(500).json({ message: "Failed to create invoice", error: invoiceError });
      }

      console.log('[INVOICE][SERVER] Invoice created successfully:', invoice);

      // Prepare invoice items
      const invoiceItems = items.map((item: InvoiceItem) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        unit_of_measure: item.unit_of_measure,
        line_total: item.line_total,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      console.log('[INVOICE][SERVER] Preparing invoice items insert:', invoiceItems);

      // Insert the invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('[INVOICE][SERVER] Supabase invoice items insert error:', itemsError);
        // Attempt to delete the invoice if items insertion fails
        await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id);
        return res.status(500).json({ message: "Failed to create invoice items", error: itemsError });
      }

      console.log('[INVOICE][SERVER] Invoice items created successfully');
      
      // Return the complete invoice with items
      const { data: completeInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq('id', invoice.id)
        .single();

      if (fetchError) {
        console.error('[INVOICE][SERVER] Error fetching complete invoice:', fetchError);
        return res.status(500).json({ message: "Invoice created but failed to fetch complete data" });
      }

      res.status(201).json(completeInvoice);
    } catch (err) {
      console.error('[INVOICE][SERVER] Unexpected exception during invoice creation:', err);
      return res.status(500).json({ message: "Unexpected server error" });
    }
  } catch (error) {
    console.error('[INVOICE][SERVER] Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download invoice PDF
router.get('/:id/download', async (req: Request, res: Response) => {
  console.log('[INVOICE][SERVER] Download request for invoice:', req.params.id);
  
  try {
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', req.params.id)
      .single();

    if (invoiceError || !invoice) {
      console.error('[INVOICE][SERVER] Error fetching invoice:', invoiceError);
      return res.status(404).json({ message: "Invoice not found" });
    }

    console.log('[INVOICE][SERVER] Fetched invoice data:', invoice);

    // Generate PDF
    const pdfBuffer = await generatePdf(invoice, invoice.items, invoice.xml_content || '');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[INVOICE][SERVER] Error generating PDF:', error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

export default router; 