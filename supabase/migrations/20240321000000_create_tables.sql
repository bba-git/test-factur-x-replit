-- Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    vat_number TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    bank_account TEXT,
    bank_name TEXT,
    iban TEXT,
    bic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    unit_price REAL NOT NULL,
    vat_rate REAL NOT NULL,
    unit_of_measure TEXT NOT NULL,
    sku TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    vat_rate REAL NOT NULL,
    unit_of_measure TEXT NOT NULL,
    line_total REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id),
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    subtotal REAL NOT NULL,
    vat_total REAL NOT NULL,
    total REAL NOT NULL,
    notes TEXT,
    payment_terms TEXT,
    purchase_order_ref TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    profile TEXT NOT NULL DEFAULT 'BASIC_WL',
    validation_status TEXT NOT NULL DEFAULT 'PENDING',
    validation_messages JSONB,
    pdf_url TEXT,
    xml_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for company_profiles
CREATE POLICY "Enable read access for all users" ON company_profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON company_profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON company_profiles
    FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete for all users" ON company_profiles
    FOR DELETE
    USING (true);

-- Create policies for products
CREATE POLICY "Enable read access for all users" ON products
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON products
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON products
    FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete for all users" ON products
    FOR DELETE
    USING (true);

-- Create policies for invoice_items
CREATE POLICY "Enable read access for all users" ON invoice_items
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON invoice_items
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON invoice_items
    FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete for all users" ON invoice_items
    FOR DELETE
    USING (true);

-- Create policies for invoices
CREATE POLICY "Enable read access for all users" ON invoices
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON invoices
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON invoices
    FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete for all users" ON invoices
    FOR DELETE
    USING (true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 