import express from 'express';
import { supabase } from '../supabaseClient';

interface CompanyProfileDB {
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
  bank_account: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyProfileResponse {
  id: string;
  name: string;
  vatNumber: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  bankAccount: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
}

type CompanyProfileInsert = Omit<CompanyProfileDB, 'id' | 'created_at' | 'updated_at'>;

const router = express.Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('company_profiles').select('*');
  if (error) return res.status(500).json({ message: error.message });
  
  // Transform snake_case to camelCase
  const transformedData = (data as CompanyProfileDB[]).map(profile => ({
    id: profile.id,
    name: profile.name,
    vatNumber: profile.vat_number,
    address: profile.address,
    city: profile.city,
    postalCode: profile.postal_code,
    country: profile.country,
    contactPerson: profile.contact_person,
    email: profile.email,
    phone: profile.phone,
    bankAccount: profile.bank_account,
    bankName: profile.bank_name,
    iban: profile.iban,
    bic: profile.bic
  }));
  
  res.json(transformedData);
});

router.post('/', async (req, res) => {
  console.log('=== START POST /api/company-profiles ===');
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  
  // Transform camelCase to snake_case for database
  const transformedData: CompanyProfileInsert = {
    name: req.body.name,
    vat_number: req.body.vat_number || null,
    address: req.body.address || null,
    city: req.body.city || null,
    postal_code: req.body.postal_code || null,
    country: req.body.country || null,
    contact_person: req.body.contact_person || null,
    email: req.body.email || null,
    phone: req.body.phone || null,
    bank_account: req.body.bank_account || null,
    bank_name: req.body.bank_name || null,
    iban: req.body.iban || null,
    bic: req.body.bic || null
  };

  console.log('Transformed data before cleanup:', JSON.stringify(transformedData, null, 2));

  // Remove any undefined or empty string values
  (Object.keys(transformedData) as Array<keyof CompanyProfileInsert>).forEach(key => {
    if (transformedData[key] === undefined || transformedData[key] === '') {
      (transformedData as any)[key] = null;
    }
  });

  console.log('Final transformed data for Supabase:', JSON.stringify(transformedData, null, 2));

  try {
    console.log('Attempting Supabase insert...');
    const { data, error } = await supabase
      .from('company_profiles')
      .insert(transformedData)
      .select('*')
      .single();

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      console.error('No data returned from Supabase insert');
      return res.status(500).json({ message: 'No data returned from Supabase' });
    }

    console.log('Successfully inserted data:', JSON.stringify(data, null, 2));
    
    // Transform response back to camelCase
    const responseData: CompanyProfileResponse = {
      id: (data as CompanyProfileDB).id,
      name: (data as CompanyProfileDB).name,
      vatNumber: (data as CompanyProfileDB).vat_number,
      address: (data as CompanyProfileDB).address,
      city: (data as CompanyProfileDB).city,
      postalCode: (data as CompanyProfileDB).postal_code,
      country: (data as CompanyProfileDB).country,
      contactPerson: (data as CompanyProfileDB).contact_person,
      email: (data as CompanyProfileDB).email,
      phone: (data as CompanyProfileDB).phone,
      bankAccount: (data as CompanyProfileDB).bank_account,
      bankName: (data as CompanyProfileDB).bank_name,
      iban: (data as CompanyProfileDB).iban,
      bic: (data as CompanyProfileDB).bic
    };

    console.log('Final response data:', JSON.stringify(responseData, null, 2));
    console.log('=== END POST /api/company-profiles ===');
    
    res.status(201).json(responseData);
  } catch (err) {
    console.error('Unexpected error in POST /api/company-profiles:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 