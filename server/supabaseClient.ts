import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetch } from 'undici';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('[FATAL] SUPABASE_URL is not set in environment. Exiting.');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('[FATAL] SUPABASE_ANON_KEY is not set in environment. Exiting.');
  process.exit(1);
}

// Mask the key, show only the domain
try {
  const url = new URL(supabaseUrl);
  console.log(`[BOOT] SUPABASE_URL: ${url.origin}`);
} catch (e) {
  console.log(`[BOOT] SUPABASE_URL: ${supabaseUrl}`);
}

// Test the connection to Supabase before creating the client
const testConnection = async () => {
  try {
    console.log('[BOOT] Testing Supabase connection...');
    const response = await fetch(`${supabaseUrl}/rest/v1/customers?select=count&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('[BOOT] Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('[FATAL] Failed to connect to Supabase:', error);
    process.exit(1);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: fetch as any
  }
});

// Run the connection test
testConnection(); 