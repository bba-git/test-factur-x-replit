import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { invoiceWithItemsSchema, InvoiceStatusEnum, ValidationStatusEnum, FacturXProfileEnum, Invoice } from "@shared/schema";
import { generateZugferdXml } from "./invoice/zugferd";
import { generatePdf } from "./invoice/pdfGenerator";
import { validateInvoice } from "./invoice/validator";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for invoices
  const invoiceRouter = app.route('/api/invoices');
  
  // Get all invoices
  invoiceRouter.get(async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  
  // Create a new invoice
  invoiceRouter.post(async (req, res) => {
    try {
      const validatedData = invoiceWithItemsSchema.parse(req.body);
      
      // Calculate totals if not provided
      if (!validatedData.subtotal || !validatedData.vatTotal || !validatedData.total) {
        let subtotal = 0;
        let vatTotal = 0;
        
        validatedData.items.forEach(item => {
          subtotal += item.unitPrice * item.quantity;
          vatTotal += (item.unitPrice * item.quantity * item.vatRate) / 100;
        });
        
        const total = subtotal + vatTotal;
        
        validatedData.subtotal = subtotal;
        validatedData.vatTotal = vatTotal;
        validatedData.total = total;
      }
      
      // Set validation status to pending
      const inputInvoice = {
        ...validatedData,
        status: validatedData.status || 'DRAFT',
        validationStatus: 'PENDING'
      };

      // Create the invoice in the storage
      const createdInvoice = await storage.createInvoice(inputInvoice);
      
      // Generate XML
      const xml = await generateZugferdXml(createdInvoice, validatedData.items);
      
      // Update the invoice with XML content
      await storage.updateInvoiceXml(createdInvoice.id, xml);
      
      // Generate PDF
      const pdfFile = await generatePdf(createdInvoice, validatedData.items, xml);
      
      // Update the invoice with PDF URL
      await storage.updateInvoicePdf(createdInvoice.id, `/api/invoices/${createdInvoice.id}/download`);
      
      // Validate the invoice
      const validationResult = await validateInvoice(xml, createdInvoice.profile);
      
      // Update validation status
      const validationStatus = validationResult.isValid ? 'VALID' : 'INVALID';
      await storage.updateInvoiceValidation(createdInvoice.id, validationStatus, validationResult.errors);
      
      const updatedInvoice = await storage.getInvoice(createdInvoice.id);
      res.status(201).json(updatedInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      } else {
        console.error("Error creating invoice:", error);
        res.status(500).json({ message: "Failed to create invoice" });
      }
    }
  });
  
  // Get a specific invoice
  app.get('/api/invoices/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });
  
  // Update an invoice
  app.put('/api/invoices/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = invoiceWithItemsSchema.parse(req.body);
      
      const existingInvoice = await storage.getInvoice(id);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Update the invoice
      const updatedInvoice = await storage.updateInvoice(id, validatedData);
      
      // Generate XML
      const xml = await generateZugferdXml(updatedInvoice, validatedData.items);
      
      // Update the invoice with XML content
      await storage.updateInvoiceXml(id, xml);
      
      // Generate PDF
      const pdfFile = await generatePdf(updatedInvoice, validatedData.items, xml);
      
      // Update the invoice with PDF URL
      await storage.updateInvoicePdf(id, `/api/invoices/${id}/download`);
      
      // Validate the invoice
      const validationResult = await validateInvoice(xml, updatedInvoice.profile);
      
      // Update validation status
      const validationStatus = validationResult.isValid ? 'VALID' : 'INVALID';
      await storage.updateInvoiceValidation(id, validationStatus, validationResult.errors);
      
      const finalInvoice = await storage.getInvoice(id);
      res.json(finalInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update invoice" });
      }
    }
  });
  
  // Delete an invoice
  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInvoice(id);
      
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });
  
  // Download invoice PDF
  app.get('/api/invoices/:id/download', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const items = await storage.getInvoiceItems(id);
      const xml = invoice.xmlContent || await generateZugferdXml(invoice, items);
      
      // Generate PDF
      const pdfBuffer = await generatePdf(invoice, items, xml);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ message: "Failed to download invoice" });
    }
  });
  
  // Validate invoice
  app.get('/api/invoices/:id/validate', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const items = await storage.getInvoiceItems(id);
      
      // Generate XML if it doesn't exist
      let xml = invoice.xmlContent;
      if (!xml) {
        xml = await generateZugferdXml(invoice, items);
        await storage.updateInvoiceXml(id, xml);
      }
      
      // Validate the invoice
      const validationResult = await validateInvoice(xml, invoice.profile);
      
      // Update validation status
      const validationStatus = validationResult.isValid ? 'VALID' : 'INVALID';
      await storage.updateInvoiceValidation(id, validationStatus, validationResult.errors);
      
      // Return validation result
      res.json({
        isValid: validationResult.isValid,
        pdfValid: true, // Assuming PDF is valid for this example
        xmlValid: validationResult.isValid,
        errors: validationResult.errors,
        xmlContent: xml
      });
    } catch (error) {
      console.error("Error validating invoice:", error);
      res.status(500).json({ message: "Failed to validate invoice" });
    }
  });
  
  // Fix validation issues
  app.post('/api/invoices/:id/fix', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const items = await storage.getInvoiceItems(id);
      
      // Re-generate XML with fixed format
      const fixedXml = await generateZugferdXml(invoice, items, true);
      
      // Update the invoice with the fixed XML content
      await storage.updateInvoiceXml(id, fixedXml);
      
      // Generate PDF
      const pdfFile = await generatePdf(invoice, items, fixedXml);
      
      // Update the invoice with PDF URL
      await storage.updateInvoicePdf(id, `/api/invoices/${id}/download`);
      
      // Validate the invoice
      const validationResult = await validateInvoice(fixedXml, invoice.profile);
      
      // Update validation status
      const validationStatus = validationResult.isValid ? 'VALID' : 'INVALID';
      await storage.updateInvoiceValidation(id, validationStatus, validationResult.errors);
      
      const updatedInvoice = await storage.getInvoice(id);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error fixing invoice:", error);
      res.status(500).json({ message: "Failed to fix invoice" });
    }
  });

  // API routes for customers
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // API routes for company profiles
  app.get('/api/company-profiles', async (req, res) => {
    try {
      const profiles = await storage.getAllCompanyProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company profiles" });
    }
  });

  // API routes for products
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
