import { createClient } from '@supabase/supabase-js'

// Supabase Project: xgippckdzpowzgdrekyo (ap-southeast-2)
// Connection: postgresql://postgres.xgippckdzpowzgdrekyo:...@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
const supabaseUrl = 'https://xgippckdzpowzgdrekyo.supabase.co'

// NOTE: Replace this with your actual anon/public key from:
// Supabase Dashboard → Settings → API → Project API keys → anon public
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
