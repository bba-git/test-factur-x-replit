import { pgTable, text, serial, integer, boolean, timestamp, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Customer schema
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vatNumber: text("vat_number"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Company profile schema
export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vatNumber: text("vat_number").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  iban: text("iban"),
  bic: text("bic"),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({
  id: true,
});

export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: real("unit_price").notNull(),
  vatRate: real("vat_rate").notNull(),
  unitOfMeasure: text("unit_of_measure").notNull(),
  sku: text("sku"),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Invoice status enum
export const InvoiceStatusEnum = z.enum(["DRAFT", "SENT", "PAID", "CANCELLED", "OVERDUE"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

// Factur-X profile enum
export const FacturXProfileEnum = z.enum(["MINIMUM", "BASIC_WL", "EN16931"]);
export type FacturXProfile = z.infer<typeof FacturXProfileEnum>;

// Invoice validation status enum
export const ValidationStatusEnum = z.enum(["VALID", "INVALID", "PENDING"]);
export type ValidationStatus = z.infer<typeof ValidationStatusEnum>;

// Invoice line items schema
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  productId: integer("product_id"),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  vatRate: real("vat_rate").notNull(),
  unitOfMeasure: text("unit_of_measure").notNull(),
  lineTotal: real("line_total").notNull(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  invoiceId: true,
});

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// Invoices schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  companyProfileId: integer("company_profile_id").notNull(),
  issueDate: text("issue_date").notNull(), // ISO format date string
  dueDate: text("due_date").notNull(),     // ISO format date string
  currency: text("currency").notNull().default("EUR"),
  subtotal: real("subtotal").notNull(),
  vatTotal: real("vat_total").notNull(),
  total: real("total").notNull(),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  purchaseOrderRef: text("purchase_order_ref"),
  status: text("status").notNull().default("DRAFT"),
  profile: text("profile").notNull().default("BASIC_WL"),
  validationStatus: text("validation_status").notNull().default("PENDING"),
  validationMessages: json("validation_messages").$type<string[]>(),
  pdfUrl: text("pdf_url"),
  xmlContent: text("xml_content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  pdfUrl: true,
  xmlContent: true,
  validationStatus: true,
  validationMessages: true
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Extended invoice schema with line items
export const invoiceWithItemsSchema = insertInvoiceSchema.extend({
  items: z.array(insertInvoiceItemSchema),
});

export type InvoiceWithItems = z.infer<typeof invoiceWithItemsSchema>;

// Response type for invoice with items
export type InvoiceResponse = Invoice & {
  items: InvoiceItem[];
  customer: Customer;
  companyProfile: CompanyProfile;
};
