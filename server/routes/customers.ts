import express from 'express';
import { supabase } from '../supabaseClient';
import { insertAndReturn } from '../utils/supabase/insertAndReturn';
import { getAuthenticatedUser } from '../middleware/getAuthenticatedUser';
import { logger, safeLog } from '../utils/logger';

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
    logger.error({ error }, 'Failed to fetch customers');
    return res.status(500).json({ message: 'Failed to fetch customers' });
  }
  
  logger.debug({ customers: data }, 'Fetched customers');
  res.json(data);
});

router.post('/', async (req, res) => {
  logger.info('=== START POST /api/customers ===');
  logger.debug({ body: req.body }, 'Raw request body');
  
  try {
    // Get the first company profile (for now, we'll use the first one)
    const { data: company, error: companyError } = await supabase
      .from('company_profiles')
      .select('id')
      .limit(1)
      .single();

    if (companyError || !company) {
      logger.error('No company profile found');
      return res.status(403).json({ message: 'No company profile found' });
    }

    logger.debug({ companyId: company.id }, 'Using company profile');
    
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

    logger.debug({ data: transformedData }, 'Final customer payload');

    const { data, error } = await supabase
      .from('customers')
      .insert(transformedData)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create customer');
      return res.status(500).json({ message: 'Failed to create customer' });
    }

    logger.debug({ customer: data }, 'Created customer');
    res.json(data);
  } catch (error) {
    logger.error({ error }, 'Unexpected error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 