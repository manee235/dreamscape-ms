// Script to push the Dreamscape MS schema to Supabase PostgreSQL
import pkg from 'pg'
const { Client } = pkg

const connectionString =
  'postgresql://postgres.xgippckdzpowzgdrekyo:%5BManamiash%402003%5D@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres'

const sql = `
-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  project_type VARCHAR(100) DEFAULT 'House Design',
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(100) DEFAULT 'Cash',
  reference_number VARCHAR(255),
  notes TEXT,
  marked_by VARCHAR(255) DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: project payment summary
CREATE OR REPLACE VIEW project_payment_summary AS
SELECT 
  p.id AS project_id,
  p.project_name,
  p.project_type,
  p.status,
  p.total_amount,
  p.client_id,
  c.name AS client_name,
  c.email AS client_email,
  c.phone AS client_phone,
  COALESCE(SUM(pm.amount), 0) AS paid_amount,
  p.total_amount - COALESCE(SUM(pm.amount), 0) AS remaining_amount,
  p.start_date,
  p.end_date,
  p.created_at
FROM projects p
JOIN clients c ON c.id = p.client_id
LEFT JOIN payments pm ON pm.project_id = p.id
GROUP BY p.id, p.project_name, p.project_type, p.status, p.total_amount,
         p.client_id, c.name, c.email, c.phone, p.start_date, p.end_date, p.created_at;
`

const sampleData = `
-- Sample clients (skip if already exist)
INSERT INTO clients (name, email, phone, address)
SELECT 'Nimal Perera', 'nimal@gmail.com', '0771234567', 'No 12, Galle Road, Colombo 03'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Nimal Perera');

INSERT INTO clients (name, email, phone, address)
SELECT 'Sunil Fernando', 'sunil@gmail.com', '0712345678', 'No 45, Kandy Road, Kurunegala'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Sunil Fernando');

INSERT INTO clients (name, email, phone, address)
SELECT 'Kamala Silva', 'kamala@gmail.com', '0761234567', 'No 7, Temple Road, Kandy'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Kamala Silva');
`

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('Connected! Running schema...')
    await client.query(sql)
    console.log('Schema created successfully.')
    await client.query(sampleData)
    console.log('Sample data inserted.')
    
    // Also try to get current JWT signing secret to derive anon key
    const res = await client.query("SELECT current_database(), version()")
    console.log('Database:', res.rows[0])
    console.log('\n✅ Dreamscape MS database is ready!')
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()

