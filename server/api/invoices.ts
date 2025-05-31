import express from 'express';
import { validateInvoice } from '../invoice/validator';
import { supabase } from '../supabaseClient';

const router = express.Router();

router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch invoice data from Supabase
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      return res.status(500).json({ error: 'Failed to fetch invoice data' });
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get XML content from the invoice
    const xmlContent = invoice.xml_content;
    if (!xmlContent) {
      return res.status(400).json({ error: 'No XML content found in invoice' });
    }

    // Validate the invoice
    const validationResult = await validateInvoice(xmlContent, 'EN16931');

    // Format the response
    const response = {
      isValid: validationResult.isValid,
      checks: {
        profileId: validationResult.results['Profile ID Validation'],
        basicData: validationResult.results['Invoice Basic Data'],
        currencyCode: validationResult.results['Currency Code'],
        xsdValidation: validationResult.results['XSD Validation'],
        schematronValidation: validationResult.results['Schematron Validation']
      },
      errors: validationResult.errors
    };

    res.json(response);
  } catch (error) {
    console.error('Error validating invoice:', error);
    res.status(500).json({ error: 'Failed to validate invoice' });
  }
});

export default router; 