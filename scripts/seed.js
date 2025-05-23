import fetch from 'node-fetch';

const api = 'http://localhost:5000/api';

async function getJsonOrText(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    console.error('Non-JSON response:', text);
    throw e;
  }
}

async function seed() {
  // 1. Create company profile
  const companyProfileRes = await fetch(`${api}/company-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Demo Company',
      vat_number: 'FR123456789',
      address: '123 Demo St',
      email: 'info@demo.com',
      phone: '+33123456789'
    })
  });
  const companyProfile = await getJsonOrText(companyProfileRes);

  // 2. Create customer (linked to company profile)
  const customerRes = await fetch(`${api}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Demo Customer',
      vat_number: 'FR987654321',
      address: '456 Customer Ave',
      email: 'customer@demo.com',
      phone: '+33987654321',
      company_profile_id: companyProfile.id || companyProfile.data?.id // adapt if needed
    })
  });
  const customer = await getJsonOrText(customerRes);

  console.log('Seeded company profile:', companyProfile);
  console.log('Seeded customer:', customer);
}

seed().catch(console.error); 