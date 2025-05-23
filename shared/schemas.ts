import { z } from 'zod';
import { FacturXProfile, InvoiceStatus } from './types';

// Base schema for common fields
const baseSchema = z.object({
  id: z.string().uuid(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

// Enhanced validation patterns
const patterns = {
  iban: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/,
  bic: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  vat: /^[A-Z]{2}[0-9A-Z]{8,12}$/,
  phone: /^\+?[0-9\s-()]{8,20}$/
};

// Company Profile Schema with enhanced validation
export const companyProfileSchema = baseSchema.extend({
  name: z.string().min(1, 'Company name is required'),
  vat_number: z.string().regex(patterns.vat, 'Invalid VAT number format').nullable(),
  address: z.string().nullable(),
  email: z.string().email('Invalid email format').nullable(),
  phone: z.string().regex(patterns.phone, 'Invalid phone number format').nullable(),
  city: z.string().nullable(),
  postal_code: z.string().nullable(),
  country: z.string().nullable(),
  contact_person: z.string().nullable(),
  bank_account: z.string().nullable(),
  bank_name: z.string().nullable(),
  iban: z.string().regex(patterns.iban, 'Invalid IBAN format').nullable(),
  bic: z.string().regex(patterns.bic, 'Invalid BIC format').nullable()
});

// Company Profile Form Schema (camelCase for frontend)
export const companyProfileFormSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  vatNumber: z.string().regex(patterns.vat, 'Invalid VAT number format').nullable(),
  address: z.string().nullable(),
  email: z.string().email('Invalid email format').nullable(),
  phone: z.string().regex(patterns.phone, 'Invalid phone number format').nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  contactPerson: z.string().nullable(),
  bankAccount: z.string().nullable(),
  bankName: z.string().nullable(),
  iban: z.string().regex(patterns.iban, 'Invalid IBAN format').nullable(),
  bic: z.string().regex(patterns.bic, 'Invalid BIC format').nullable()
});

// Customer Schema
export const customerSchema = baseSchema.extend({
  name: z.string().min(1, 'Customer name is required'),
  company_profile_id: z.string().uuid().nullable(),
  vat_number: z.string().nullable(),
  address: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().nullable(),
  contact_person: z.string().nullable()
});

// Customer Form Schema (camelCase for frontend)
export const customerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  vatNumber: z.string().nullable(),
  address: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().nullable(),
  contactPerson: z.string().nullable()
});

// Invoice Item Schema
export const invoiceItemSchema = baseSchema.extend({
  invoice_id: z.string().uuid(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().positive('Unit price must be positive'),
  vat_rate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
  line_total: z.number().positive('Line total must be positive'),
  unit_of_measure: z.string().nullable(),
  product_id: z.string().uuid().nullable()
});

// Invoice Schema
export const invoiceSchema = baseSchema.extend({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  company_profile_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  issue_date: z.date(),
  due_date: z.date(),
  currency: z.string().min(1, 'Currency is required'),
  subtotal: z.number().positive('Subtotal must be positive'),
  vat_total: z.number().min(0, 'VAT total must be non-negative'),
  total: z.number().positive('Total must be positive'),
  payment_terms: z.string().nullable(),
  profile: z.nativeEnum(FacturXProfile),
  status: z.nativeEnum(InvoiceStatus),
  notes: z.string().nullable(),
  purchase_order_ref: z.string().nullable(),
  metadata: z.any().nullable(),
  deleted_at: z.date().nullable()
});

// Invoice with Items Schema
export const invoiceWithItemsSchema = invoiceSchema.extend({
  items: z.array(invoiceItemSchema),
  customer: customerSchema,
  company_profile: companyProfileSchema
});

// Form Schemas (camelCase for frontend)
export const invoiceItemFormSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  vatRate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
  lineTotal: z.number().positive('Line total must be positive'),
  unitOfMeasure: z.string().optional(),
  productId: z.string().uuid().optional()
});

export const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  companyProfileId: z.string().uuid(),
  customerId: z.string().uuid(),
  issueDate: z.date(),
  dueDate: z.date(),
  currency: z.string().min(1, 'Currency is required'),
  subtotal: z.number().positive('Subtotal must be positive'),
  vatTotal: z.number().min(0, 'VAT total must be non-negative'),
  total: z.number().positive('Total must be positive'),
  paymentTerms: z.string().optional(),
  profile: z.nativeEnum(FacturXProfile),
  status: z.nativeEnum(InvoiceStatus),
  notes: z.string().optional(),
  purchaseOrderRef: z.string().optional(),
  metadata: z.any().optional(),
  items: z.array(invoiceItemFormSchema)
});

// Product Schema
export const productSchema = baseSchema.extend({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().nullable(),
  unit_price: z.number().positive('Unit price must be positive'),
  vat_rate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  sku: z.string().nullable()
});

// Validation Result Schema
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string())
});

// API Response Schema
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  }); 