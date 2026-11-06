import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://xgippckdzpowzgdrekyo.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaXBwY2tkenBvd3pnZHJla3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5Mzk0NzUsImV4cCI6MjEwOTUxNTQ3NX0.73vkg3gyBouWbDm-dvTIapc3IJQ1bxmnt13gQTqdM0I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
