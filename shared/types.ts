// Factur-X Profile Enum
export enum FacturXProfile {
  MINIMUM = 'MINIMUM',
  BASIC_WL = 'BASIC_WL',
  EN16931 = 'EN16931',
  EXTENDED = 'EXTENDED'
}

// Invoice Status Enum
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

// Base interface for all entities
interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
}

// Company Profile Interface
export interface CompanyProfile extends BaseEntity {
  name: string;
  vat_number: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  contact_person: string | null;
  bank_account: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
}

// Customer Interface
export interface Customer extends BaseEntity {
  name: string;
  company_profile_id: string | null;
  vat_number: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  postal_code: string;
  country: string;
  contact_person: string | null;
}

// Invoice Item Interface
export interface InvoiceItem extends BaseEntity {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  unit_of_measure: string | null;
  product_id: string | null;
}

// Invoice Interface
export interface Invoice extends BaseEntity {
  invoice_number: string;
  company_profile_id: string;
  customer_id: string;
  issue_date: Date;
  due_date: Date;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  payment_terms: string | null;
  profile: string;
  status: InvoiceStatus;
  notes: string | null;
  purchase_order_ref: string | null;
  metadata: any | null;
  deleted_at: Date | null;
}

// Invoice with related data
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  customer: Customer;
  company_profile: CompanyProfile;
}

// Product Interface
export interface Product extends BaseEntity {
  name: string;
  description: string | null;
  unit_price: number;
  vat_rate: number;
  unit_of_measure: string;
  sku: string | null;
}

// Validation Result Interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Form Types (camelCase for frontend)
export interface InvoiceFormData {
  invoiceNumber: string;
  companyProfileId: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  paymentTerms?: string;
  profile: string;
  status: InvoiceStatus;
  notes?: string;
  purchaseOrderRef?: string;
  metadata?: any;
  items: InvoiceItemFormData[];
}

export interface InvoiceItemFormData {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
  unitOfMeasure?: string;
  productId?: string;
}

// Type Guards
export function isInvoice(obj: any): obj is Invoice {
  return obj 
    && typeof obj.invoice_number === 'string'
    && typeof obj.company_profile_id === 'string'
    && typeof obj.customer_id === 'string'
    && obj.issue_date instanceof Date
    && obj.due_date instanceof Date;
}

export function isInvoiceItem(obj: any): obj is InvoiceItem {
  return obj
    && typeof obj.invoice_id === 'string'
    && typeof obj.description === 'string'
    && typeof obj.quantity === 'number'
    && typeof obj.unit_price === 'number'
    && typeof obj.vat_rate === 'number'
    && typeof obj.line_total === 'number';
} 