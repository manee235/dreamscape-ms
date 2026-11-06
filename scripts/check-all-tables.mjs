import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xgippckdzpowzgdrekyo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaXBwY2tkenBvd3pnZHJla3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5Mzk0NzUsImV4cCI6MjEwOTUxNTQ3NX0.73vkg3gyBouWbDm-dvTIapc3IJQ1bxmnt13gQTqdM0I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAll() {
  console.log('Testing each table individually via Supabase PostgREST API:');
  
  const tables = ['clients', 'projects', 'payments', 'admin_users', 'project_payment_summary'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (error) {
      console.error(`❌ Table "${table}" error:`, error.message, error.details || '');
    } else {
      console.log(`✅ Table "${table}" is accessible! Found ${data.length} records.`);
    }
  }
}

checkAll();

