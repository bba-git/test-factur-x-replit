import express, { Request, Response } from 'express';
import { supabase } from '../supabaseClient';
import { insertAndReturn } from '../utils/supabase/insertAndReturn';
import { getAuthenticatedUser } from '../middleware/getAuthenticatedUser';
import { logger, safeLog, WORKFLOW } from '../utils/logger';
import { generatePdf } from '../utils/pdf/generatePdf';
import { generateZugferdXml } from '../invoice/zugferd';
import { Invoice, InvoiceItem } from '@shared/schema';

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
router.get('/', async (req: Request, res: Response) => {
  const { companyProfileId } = req.context!;
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_profile_id', companyProfileId);

  if (error) {
    logger.error({ 
      workflow: WORKFLOW.INVOICE,
      error,
      requestId: req.requestId 
    }, 'Failed to fetch invoices');
    return res.status(500).json({ message: 'Failed to fetch invoices' });
  }
  
  logger.debug({ 
    workflow: WORKFLOW.INVOICE,
    invoices: data,
    requestId: req.requestId 
  }, 'Fetched invoices');
  res.json(data);
});

// Create an invoice
router.post('/', async (req: Request, res: Response) => {
  logger.info({ 
    workflow: WORKFLOW.INVOICE,
    requestId: req.requestId 
  }, 'Starting invoice creation');
  
  try {
    // Early validation
    if (!req.context?.companyProfileId) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        requestId: req.requestId 
      }, 'Missing company context');
      return res.status(401).json({ message: 'Missing company context' });
    }

    if (!req.body.customer_id) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        requestId: req.requestId 
      }, 'Missing customer ID');
      return res.status(400).json({ message: 'Missing customer ID' });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        requestId: req.requestId 
      }, 'No items in invoice');
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
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: customerError,
        customer_id: req.body.customer_id,
        company_profile_id: req.context.companyProfileId,
        requestId: req.requestId 
      }, 'Customer validation failed');
      return res.status(403).json({ message: "Invalid customer or customer does not belong to your company" });
    }

    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      requestId: req.requestId 
    }, 'Validated customer ownership');

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

    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      payload: invoicePayload,
      requestId: req.requestId 
    }, 'Preparing invoice insert payload');

    try {
      // Insert the invoice first
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .single();

      if (invoiceError) {
        logger.error({ 
          workflow: WORKFLOW.INVOICE,
          error: invoiceError,
          requestId: req.requestId 
        }, 'Failed to create invoice');
        return res.status(500).json({ message: "Failed to create invoice", error: invoiceError });
      }

      logger.debug({ 
        workflow: WORKFLOW.INVOICE,
        invoice,
        requestId: req.requestId 
      }, 'Invoice created successfully');

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

      logger.debug({ 
        workflow: WORKFLOW.INVOICE,
        items: invoiceItems,
        requestId: req.requestId 
      }, 'Preparing invoice items insert');

      // Insert the invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        logger.error({ 
          workflow: WORKFLOW.INVOICE,
          error: itemsError,
          requestId: req.requestId 
        }, 'Failed to create invoice items');
        // Attempt to delete the invoice if items insertion fails
        await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id);
        return res.status(500).json({ message: "Failed to create invoice items", error: itemsError });
      }

      logger.debug({ 
        workflow: WORKFLOW.INVOICE,
        requestId: req.requestId 
      }, 'Invoice items created successfully');
      
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
        logger.error({ 
          workflow: WORKFLOW.INVOICE,
          error: fetchError,
          requestId: req.requestId 
        }, 'Error fetching complete invoice');
        return res.status(500).json({ message: "Invoice created but failed to fetch complete data" });
      }

      res.status(201).json(completeInvoice);
    } catch (err) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: err,
        requestId: req.requestId 
      }, 'Unexpected exception during invoice creation');
      return res.status(500).json({ message: "Unexpected server error" });
    }
  } catch (error) {
    logger.error({ 
      workflow: WORKFLOW.INVOICE,
      error,
      requestId: req.requestId 
    }, 'Unexpected error in invoice creation');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download invoice PDF
router.get('/:id/download', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info({ 
    workflow: WORKFLOW.INVOICE,
    invoiceId: id,
    requestId: req.requestId 
  }, 'Starting invoice download');

  try {
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: invoiceError,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Invoice not found');
      return res.status(404).json({ message: 'Invoice not found' });
    }

    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: id,
      invoice: safeLog(invoice),
      requestId: req.requestId 
    }, 'Found invoice, fetching items');

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: itemsError,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Failed to fetch invoice items');
      return res.status(500).json({ message: 'Failed to fetch invoice items' });
    }

    if (!items || items.length === 0) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: id,
        requestId: req.requestId 
      }, 'No items found for invoice');
      return res.status(400).json({ message: 'Invoice has no items' });
    }

    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: id,
      items: safeLog(items),
      requestId: req.requestId 
    }, 'Found invoice items, generating XML');

    // Generate XML
    let xml: string;
    try {
      xml = await generateZugferdXml(invoice as Invoice, items as InvoiceItem[]);
      
      if (!xml || xml.length === 0) {
        logger.error({ 
          workflow: WORKFLOW.INVOICE,
          invoiceId: id,
          requestId: req.requestId 
        }, 'Generated XML is empty');
        return res.status(500).json({ message: 'Failed to generate PDF' });
      }

      logger.debug({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: id,
        xmlLength: xml.length,
        xmlPreview: xml.substring(0, 100) + '...',
        requestId: req.requestId 
      }, 'Generated XML, starting PDF generation');
    } catch (xmlError) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: xmlError,
        stack: xmlError instanceof Error ? xmlError.stack : undefined,
        invoiceId: id,
        invoice: safeLog(invoice),
        items: safeLog(items),
        requestId: req.requestId 
      }, 'Failed to generate XML');
      return res.status(500).json({ message: 'Failed to generate PDF' });
    }

    // Generate PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePdf(invoice as Invoice, items as InvoiceItem[], xml);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        logger.error({ 
          workflow: WORKFLOW.INVOICE,
          invoiceId: id,
          requestId: req.requestId 
        }, 'Generated PDF buffer is empty');
        return res.status(500).json({ message: 'Failed to generate PDF' });
      }

      logger.debug({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: id,
        pdfSize: pdfBuffer.length,
        requestId: req.requestId 
      }, 'PDF generated successfully');

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send PDF
      res.send(pdfBuffer);
      logger.info({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: id,
        pdfSize: pdfBuffer.length,
        requestId: req.requestId 
      }, 'Invoice download completed successfully');
    } catch (pdfError) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: pdfError,
        stack: pdfError instanceof Error ? pdfError.stack : undefined,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Error generating PDF');
      return res.status(500).json({ message: 'Failed to generate PDF' });
    }
  } catch (error) {
    logger.error({ 
      workflow: WORKFLOW.INVOICE,
      error,
      stack: error instanceof Error ? error.stack : undefined,
      invoiceId: id,
      requestId: req.requestId 
    }, 'Unexpected error in invoice download');
    return res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

// Download invoice XMP metadata
router.get('/:id/metadata', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info({ 
    workflow: WORKFLOW.INVOICE,
    invoiceId: id,
    requestId: req.requestId 
  }, 'Starting XMP metadata download');

  try {
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: invoiceError,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Invoice not found');
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: itemsError,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Failed to fetch invoice items');
      return res.status(500).json({ message: 'Failed to fetch invoice items' });
    }

    // Generate XML
    const xml = await generateZugferdXml(invoice as Invoice, items as InvoiceItem[]);

    // Generate XMP metadata
    const xmpMetadata = generateXMPMetadata(xml, invoice.invoice_number);

    // Set response headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}-metadata.xmp"`);
    
    // Send XMP metadata
    res.send(xmpMetadata);
    logger.info({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: id,
      requestId: req.requestId 
    }, 'XMP metadata download completed successfully');
  } catch (error) {
    logger.error({ 
      workflow: WORKFLOW.INVOICE,
      error,
      stack: error instanceof Error ? error.stack : undefined,
      invoiceId: id,
      requestId: req.requestId 
    }, 'Unexpected error in XMP metadata download');
    return res.status(500).json({ message: 'Failed to generate XMP metadata' });
  }
});

// Download invoice XML content
router.get('/:id/xml', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info({ 
    workflow: WORKFLOW.INVOICE,
    invoiceId: id,
    requestId: req.requestId 
  }, 'Starting XML content download');

  try {
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: invoiceError,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Invoice not found');
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        error: itemsError,
        invoiceId: id,
        requestId: req.requestId 
      }, 'Failed to fetch invoice items');
      return res.status(500).json({ message: 'Failed to fetch invoice items' });
    }

    // Generate XML
    const xml = await generateZugferdXml(invoice as Invoice, items as InvoiceItem[]);

    // Set response headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.xml"`);
    
    // Send XML content
    res.send(xml);
    logger.info({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: id,
      requestId: req.requestId 
    }, 'XML content download completed successfully');
  } catch (error) {
    logger.error({ 
      workflow: WORKFLOW.INVOICE,
      error,
      stack: error instanceof Error ? error.stack : undefined,
      invoiceId: id,
      requestId: req.requestId 
    }, 'Unexpected error in XML content download');
    return res.status(500).json({ message: 'Failed to generate XML content' });
  }
});

export default router; 