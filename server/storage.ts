import { users, type User, type InsertUser, Customer, InsertCustomer, CompanyProfile, InsertCompanyProfile, Product, InsertProduct, Invoice, InvoiceItem, InvoiceWithItems } from "@shared/schema";

// Storage interface
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customers
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  updateCustomer(id: number, customer: InsertCustomer): Promise<Customer>;
  deleteCustomer(id: number): Promise<boolean>;

  // Company Profiles
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  getCompanyProfile(id: number): Promise<CompanyProfile | undefined>;
  getAllCompanyProfiles(): Promise<CompanyProfile[]>;
  updateCompanyProfile(id: number, profile: InsertCompanyProfile): Promise<CompanyProfile>;
  deleteCompanyProfile(id: number): Promise<boolean>;

  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  updateProduct(id: number, product: InsertProduct): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;

  // Invoices
  createInvoice(invoice: InvoiceWithItems): Promise<Invoice>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  updateInvoice(id: number, invoice: InvoiceWithItems): Promise<Invoice>;
  deleteInvoice(id: number): Promise<boolean>;
  updateInvoiceXml(id: number, xmlContent: string): Promise<Invoice>;
  updateInvoicePdf(id: number, pdfUrl: string): Promise<Invoice>;
  updateInvoiceValidation(id: number, status: string, messages?: string[]): Promise<Invoice>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private companyProfiles: Map<number, CompanyProfile>;
  private products: Map<number, Product>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem[]>;

  private userId = 1;
  private customerId = 1;
  private companyProfileId = 1;
  private productId = 1;
  private invoiceId = 1;
  private invoiceItemId = 1;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.companyProfiles = new Map();
    this.products = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();

    // Initialize with some sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Add a sample company profile
    this.createCompanyProfile({
      name: "Your Company",
      vatNumber: "FR12345678901",
      address: "123 Main Street",
      city: "Paris",
      postalCode: "75001",
      country: "FR",
      email: "contact@yourcompany.com",
      phone: "+33123456789",
      bankAccount: "12345678901",
      bankName: "French Bank",
      iban: "FR7630006000011234567890189",
      bic: "BNPAFRPP"
    });

    // Add some sample customers
    this.createCustomer({
      name: "Acme Corporation",
      vatNumber: "FR98765432109",
      address: "456 Business Avenue",
      city: "Lyon",
      postalCode: "69001",
      country: "FR",
      contactPerson: "John Doe",
      email: "john.doe@acme.com",
      phone: "+33987654321"
    });

    this.createCustomer({
      name: "TechSolutions SAS",
      vatNumber: "FR55443322110",
      address: "789 Tech Street",
      city: "Marseille",
      postalCode: "13001",
      country: "FR",
      contactPerson: "Jane Smith",
      email: "jane.smith@techsolutions.fr",
      phone: "+33555443322"
    });

    this.createCustomer({
      name: "Global Imports GmbH",
      vatNumber: "DE123456789",
      address: "101 Import Road",
      city: "Berlin",
      postalCode: "10115",
      country: "DE",
      contactPerson: "Hans Mueller",
      email: "hans.mueller@globalimports.de",
      phone: "+491234567890"
    });

    // Add some sample products
    this.createProduct({
      name: "Web Development Services",
      description: "Professional web development services",
      unitPrice: 80,
      vatRate: 20,
      unitOfMeasure: "HOUR",
      sku: "SRV-WEB-001"
    });

    this.createProduct({
      name: "Server Hosting (Monthly)",
      description: "Dedicated server hosting, monthly fee",
      unitPrice: 99.99,
      vatRate: 20,
      unitOfMeasure: "MONTH",
      sku: "SRV-HOST-001"
    });

    this.createProduct({
      name: "UX/UI Design",
      description: "Professional UX/UI design services",
      unitPrice: 90,
      vatRate: 20,
      unitOfMeasure: "HOUR",
      sku: "SRV-DESIGN-001"
    });

    // Create sample invoices
    const sampleInvoice = {
      invoiceNumber: "INV-20210001",
      customerId: 1,
      companyProfileId: 1,
      issueDate: "2023-10-05",
      dueDate: "2023-11-04",
      currency: "EUR",
      subtotal: 1000,
      vatTotal: 200,
      total: 1200,
      notes: "Thank you for your business",
      paymentTerms: "30 days",
      purchaseOrderRef: "PO-2023-001",
      status: "SENT",
      profile: "EN16931",
      items: [
        {
          description: "Web Development Services",
          quantity: 10,
          unitPrice: 80,
          vatRate: 20,
          unitOfMeasure: "HOUR",
          lineTotal: 800,
          productId: 1
        },
        {
          description: "Server Hosting (Monthly)",
          quantity: 2,
          unitPrice: 99.99,
          vatRate: 20,
          unitOfMeasure: "MONTH",
          lineTotal: 199.98,
          productId: 2
        }
      ]
    };
    
    this.createInvoice(sampleInvoice as InvoiceWithItems);

    const secondInvoice = {
      invoiceNumber: "INV-20210002",
      customerId: 2,
      companyProfileId: 1,
      issueDate: "2023-10-12",
      dueDate: "2023-11-11",
      currency: "EUR",
      subtotal: 2200,
      vatTotal: 440,
      total: 2640,
      notes: "Payment due within 30 days",
      paymentTerms: "30 days",
      status: "DRAFT",
      profile: "BASIC_WL",
      items: [
        {
          description: "UX/UI Design",
          quantity: 20,
          unitPrice: 90,
          vatRate: 20,
          unitOfMeasure: "HOUR",
          lineTotal: 1800,
          productId: 3
        },
        {
          description: "Web Development Services",
          quantity: 5,
          unitPrice: 80,
          vatRate: 20,
          unitOfMeasure: "HOUR",
          lineTotal: 400,
          productId: 1
        }
      ]
    };
    
    this.createInvoice(secondInvoice as InvoiceWithItems);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Customer methods
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerId++;
    const newCustomer: Customer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async updateCustomer(id: number, customer: InsertCustomer): Promise<Customer> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) {
      throw new Error(`Customer with id ${id} not found`);
    }
    const updatedCustomer: Customer = { ...customer, id };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }

  // Company Profile methods
  async createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const id = this.companyProfileId++;
    const newProfile: CompanyProfile = { ...profile, id };
    this.companyProfiles.set(id, newProfile);
    return newProfile;
  }

  async getCompanyProfile(id: number): Promise<CompanyProfile | undefined> {
    return this.companyProfiles.get(id);
  }

  async getAllCompanyProfiles(): Promise<CompanyProfile[]> {
    return Array.from(this.companyProfiles.values());
  }

  async updateCompanyProfile(id: number, profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const existingProfile = this.companyProfiles.get(id);
    if (!existingProfile) {
      throw new Error(`Company profile with id ${id} not found`);
    }
    const updatedProfile: CompanyProfile = { ...profile, id };
    this.companyProfiles.set(id, updatedProfile);
    return updatedProfile;
  }

  async deleteCompanyProfile(id: number): Promise<boolean> {
    return this.companyProfiles.delete(id);
  }

  // Product methods
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productId++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async updateProduct(id: number, product: InsertProduct): Promise<Product> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      throw new Error(`Product with id ${id} not found`);
    }
    const updatedProduct: Product = { ...product, id };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Invoice methods
  async createInvoice(invoice: InvoiceWithItems): Promise<Invoice> {
    const id = this.invoiceId++;
    
    // Extract items from the invoice
    const { items, ...invoiceData } = invoice;
    
    // Set default validation status if not provided
    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      validationStatus: invoiceData.validationStatus || "PENDING",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.invoices.set(id, newInvoice);
    
    // Save invoice items
    if (items && items.length > 0) {
      const invoiceItems: InvoiceItem[] = items.map(item => ({
        ...item,
        id: this.invoiceItemId++,
        invoiceId: id
      }));
      
      this.invoiceItems.set(id, invoiceItems);
    } else {
      this.invoiceItems.set(id, []);
    }
    
    return newInvoice;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }

  async updateInvoice(id: number, invoice: InvoiceWithItems): Promise<Invoice> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) {
      throw new Error(`Invoice with id ${id} not found`);
    }
    
    // Extract items from the invoice
    const { items, ...invoiceData } = invoice;
    
    // Update the invoice
    const updatedInvoice: Invoice = {
      ...existingInvoice,
      ...invoiceData,
      updatedAt: new Date()
    };
    
    this.invoices.set(id, updatedInvoice);
    
    // Update invoice items
    if (items && items.length > 0) {
      const invoiceItems: InvoiceItem[] = items.map(item => ({
        ...item,
        id: item.id || this.invoiceItemId++,
        invoiceId: id
      }));
      
      this.invoiceItems.set(id, invoiceItems);
    }
    
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    // Delete invoice items first
    this.invoiceItems.delete(id);
    
    // Then delete the invoice
    return this.invoices.delete(id);
  }

  async updateInvoiceXml(id: number, xmlContent: string): Promise<Invoice> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) {
      throw new Error(`Invoice with id ${id} not found`);
    }
    
    const updatedInvoice: Invoice = {
      ...existingInvoice,
      xmlContent,
      updatedAt: new Date()
    };
    
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async updateInvoicePdf(id: number, pdfUrl: string): Promise<Invoice> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) {
      throw new Error(`Invoice with id ${id} not found`);
    }
    
    const updatedInvoice: Invoice = {
      ...existingInvoice,
      pdfUrl,
      updatedAt: new Date()
    };
    
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async updateInvoiceValidation(id: number, status: string, messages?: string[]): Promise<Invoice> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) {
      throw new Error(`Invoice with id ${id} not found`);
    }
    
    const updatedInvoice: Invoice = {
      ...existingInvoice,
      validationStatus: status,
      validationMessages: messages,
      updatedAt: new Date()
    };
    
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return this.invoiceItems.get(invoiceId) || [];
  }
}

export const storage = new MemStorage();
