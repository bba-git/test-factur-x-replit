-- Add missing columns to customers table
ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS postal_code TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Update existing rows to have default values for NOT NULL columns
UPDATE customers 
SET 
    city = 'Unknown',
    postal_code = 'Unknown',
    country = 'Unknown'
WHERE city IS NULL OR postal_code IS NULL OR country IS NULL;

-- Make the columns NOT NULL after setting default values
ALTER TABLE customers 
    ALTER COLUMN city SET NOT NULL,
    ALTER COLUMN postal_code SET NOT NULL,
    ALTER COLUMN country SET NOT NULL; 