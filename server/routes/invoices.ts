import express from 'express';
import { supabase } from '../supabaseClient';

const router = express.Router();

// Get all invoices
router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('invoices').select('*');
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// Create an invoice
router.post('/', async (req, res) => {
  console.log('[API] Creating invoice:', JSON.stringify(req.body, null, 2));
  
  try {
    if (!req.body) {
      console.error('[API] No request body provided');
      return res.status(400).json({ message: 'Request body is required' });
    }

    // Convert camelCase to snake_case and ensure all required fields are present
    const invoiceData = {
      invoice_number: req.body.invoice_number || req.body.invoiceNumber,
      customer_id: req.body.customer_id || req.body.customerId,
      company_profile_id: req.body.company_profile_id || req.body.companyProfileId,
      issue_date: req.body.issue_date || req.body.issueDate,
      due_date: req.body.due_date || req.body.dueDate,
      currency: req.body.currency,
      subtotal: req.body.subtotal,
      vat_total: req.body.vat_total || req.body.vatTotal,
      total: req.body.total,
      notes: req.body.notes,
      payment_terms: req.body.payment_terms || req.body.paymentTerms,
      purchase_order_ref: req.body.purchase_order_ref || req.body.purchaseOrderRef,
      status: req.body.status || 'DRAFT',
      profile: req.body.profile || 'EN16931'
    };

    // Validate required fields
    if (!invoiceData.invoice_number) {
      return res.status(400).json({ message: 'Invoice number is required' });
    }
    if (!invoiceData.customer_id || invoiceData.customer_id <= 0) {
      return res.status(400).json({ message: 'A valid customer must be selected' });
    }
    if (!invoiceData.company_profile_id) {
      return res.status(400).json({ message: 'Company profile ID is required' });
    }
    if (!invoiceData.issue_date) {
      return res.status(400).json({ message: 'Issue date is required' });
    }
    if (!invoiceData.due_date) {
      return res.status(400).json({ message: 'Due date is required' });
    }

    console.log('[API] Inserting invoice data:', invoiceData);

    const { data, error } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase error:', error);
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      console.error('[API] No data returned from Supabase');
      return res.status(500).json({ message: 'No data returned from database' });
    }

    console.log('[API] Invoice created successfully:', data);
    res.status(201).json(data);
  } catch (err) {
    console.error('[API] Unexpected error creating invoice:', err);
    res.status(500).json({ message: err instanceof Error ? err.message : 'Unknown error occurred' });
  }
});

export default router; 