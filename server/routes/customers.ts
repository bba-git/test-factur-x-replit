import express from 'express';
import { supabase } from '../supabaseClient';
import { insertAndReturn } from '../utils/supabase/insertAndReturn';
import { getAuthenticatedUser } from '../middleware/getAuthenticatedUser';

interface CustomerDB {
  id: string;
  name: string;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  company_profile_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface CustomerResponse {
  id: number;
  name: string;
  vatNumber: string | null;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(getAuthenticatedUser);

router.get('/', async (req, res) => {
  const { companyProfileId } = req.context!;
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_profile_id', companyProfileId);

  if (error) {
    console.error('[ERROR] Failed to fetch customers:', error);
    return res.status(500).json({ message: 'Failed to fetch customers' });
  }
  
  console.log('[DEBUG] Fetched customers:', data);
  res.json(data);
});

router.post('/', async (req, res) => {
  console.log('=== START POST /api/customers ===');
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Get the first company profile (for now, we'll use the first one)
    const { data: company, error: companyError } = await supabase
      .from('company_profiles')
      .select('id')
      .limit(1)
      .single();

    if (companyError || !company) {
      console.error('[ERROR] No company profile found');
      return res.status(403).json({ message: 'No company profile found' });
    }

    console.log('[DEBUG] Using company profile:', company.id);
    
    // Keep snake_case for database
    const transformedData = {
      name: req.body.name,
      vat_number: req.body.vat_number,
      address: req.body.address,
      city: req.body.city,
      postal_code: req.body.postal_code || "", // Ensure postal_code is never null
      country: req.body.country,
      contact_person: req.body.contact_person,
      email: req.body.email,
      phone: req.body.phone,
      company_profile_id: company.id // Use the company ID we just fetched
    };

    console.log('[DEBUG] Final customer payload:', JSON.stringify(transformedData, null, 2));

    const { data, error } = await supabase
      .from('customers')
      .insert(transformedData)
      .select()
      .single();

    if (error) {
      console.error('[ERROR] Failed to create customer:', error);
      return res.status(500).json({ message: 'Failed to create customer' });
    }

    console.log('[DEBUG] Created customer:', data);
    res.json(data);
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 