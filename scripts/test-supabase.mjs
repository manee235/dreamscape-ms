import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Client connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  const { data: adminData, error: adminErr } = await supabase.from('admin_users').select('*');
  if (adminErr) console.error('admin_users error:', adminErr);
  else console.log('admin_users count:', adminData.length, adminData);

  const { data: clients, error: clientsErr } = await supabase.from('clients').select('*');
  if (clientsErr) console.error('clients error:', clientsErr);
  else console.log('clients count:', clients.length);

  const { data: summary, error: summaryErr } = await supabase.from('project_payment_summary').select('*');
  if (summaryErr) console.error('project_payment_summary error:', summaryErr);
  else console.log('project_payment_summary rows:', summary.length);

  console.log('✅ All queries succeeded!');
}

testQuery();
