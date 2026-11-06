import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgippckdzpowzgdrekyo.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaXBwY2tkenBvd3pnZHJla3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5Mzk0NzUsImV4cCI6MjEwOTUxNTQ3NX0.73vkg3gyBouWbDm-dvTIapc3IJQ1bxmnt13gQTqdM0I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  const p1 = await supabase.from('clients').select('id, name, phone');
  console.log('clients:', p1.data?.length, 'error:', p1.error);

  const p2 = await supabase.from('projects').select('*');
  console.log('projects:', p2.data?.length, 'error:', p2.error);

  const p3 = await supabase.from('payments').select('*');
  console.log('payments:', p3.data?.length, 'error:', p3.error);
}

checkData();

