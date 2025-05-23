-- Remove email_token column from customers table
ALTER TABLE customers DROP COLUMN IF EXISTS email_token;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 