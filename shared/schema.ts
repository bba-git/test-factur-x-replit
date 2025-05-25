import { pgTable, text, serial, integer, boolean, timestamp, json, real, uuid } from "drizzle-orm/pg-core";
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
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  vat_number: text("vat_number"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postal_code: text("postal_code").notNull(),
  country: text("country").notNull(),
  contact_person: text("contact_person"),
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
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  vat_number: text("vat_number").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postal_code: text("postal_code").notNull(),
  country: text("country").notNull(),
  contact_person: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  bank_account: text("bank_account"),
  bank_name: text("bank_name"),
  iban: text("iban"),
  bic: text("bic"),
});

export const insertCompanyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  vat_number: z.string().min(1, "VAT number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
});

export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unit_price: real("unit_price").notNull(),
  vat_rate: real("vat_rate").notNull(),
  unit_of_measure: text("unit_of_measure").notNull(),
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
export const invoice_items = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id").notNull(),
  product_id: integer("product_id"),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  unit_price: real("unit_price").notNull(),
  vat_rate: real("vat_rate").notNull(),
  unit_of_measure: text("unit_of_measure").notNull(),
  line_total: real("line_total").notNull(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoice_items).omit({
  id: true,
  invoice_id: true,
});

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoice_items.$inferSelect;

// Invoices schema
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoice_number: text("invoice_number").notNull().unique(),
  customer_id: uuid("customer_id").notNull().references(() => customers.id),
  company_profile_id: uuid("company_profile_id").notNull().references(() => companyProfiles.id),
  issue_date: text("issue_date").notNull(), // ISO format date string
  due_date: text("due_date").notNull(),     // ISO format date string
  currency: text("currency").notNull().default("EUR"),
  subtotal: real("subtotal").notNull(),
  vat_total: real("vat_total").notNull(),
  total: real("total").notNull(),
  notes: text("notes"),
  payment_terms: text("payment_terms"),
  purchase_order_ref: text("purchase_order_ref"),
  status: text("status").notNull().default("DRAFT"),
  profile: text("profile").notNull().default("BASIC_WL"),
  validation_status: text("validation_status").notNull().default("PENDING"),
  validation_messages: json("validation_messages").$type<string[]>(),
  pdf_url: text("pdf_url"),
  xml_content: text("xml_content"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    pdf_url: true,
    xml_content: true,
    validation_status: true,
    validation_messages: true
  })
  .extend({
    customer_id: z.string().uuid("A valid customer must be selected"),
    company_profile_id: z.string().uuid("A valid company profile must be selected")
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
