import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    // Get table information
    const { data: tableInfo, error: tableError } = await supabase
      .from('company_profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Error fetching table:', tableError);
      return;
    }

    if (tableInfo && tableInfo.length > 0) {
      console.log('\nTable Structure:');
      console.log('----------------');
      Object.keys(tableInfo[0]).forEach(key => {
        console.log(`${key}: ${typeof tableInfo[0][key]}`);
      });
    } else {
      console.log('No data in table');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTable(); 