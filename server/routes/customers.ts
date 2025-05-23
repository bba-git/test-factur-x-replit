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

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  console.log('=== START POST /api/customers ===');
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  
  const { companyProfileId } = req.context!;
  
  // Validate company context
  if (!companyProfileId) {
    console.error('[ERROR] Missing company context in request');
    return res.status(403).json({ message: 'Company context missing' });
  }
  
  console.log('[DEBUG] Authenticated user company:', companyProfileId);
  
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
    company_profile_id: companyProfileId // Use the authenticated user's company
  };

  console.log('[DEBUG] Final customer payload:', JSON.stringify(transformedData, null, 2));

  try {
    console.log('Attempting Supabase insert...');
    const { data, error } = await insertAndReturn<CustomerDB>(supabase, 'customers', transformedData);

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error details:', {
        message: error.message
      });
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      console.error('No data returned from Supabase insert');
      return res.status(500).json({ message: 'No data returned from Supabase' });
    }

    console.log('Successfully inserted data:', JSON.stringify(data, null, 2));
    
    // Transform to camelCase for frontend
    const response = {
      id: data.id,
      name: data.name,
      vatNumber: data.vat_number,
      address: data.address,
      city: data.city,
      postalCode: data.postal_code,
      country: data.country,
      contactPerson: data.contact_person,
      email: data.email,
      phone: data.phone,
      companyProfileId: data.company_profile_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    
    console.log('Final response data:', JSON.stringify(response, null, 2));
    console.log('=== END POST /api/customers ===');
    
    res.status(201).json(response);
  } catch (err) {
    console.error('Unexpected error in POST /api/customers:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 