import pkg from 'pg';
const { Client } = pkg;

const passwords = ['Manamiash@2003', '[Manamiash@2003]'];
const configs = [
  // Session pooler
  {
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xgippckdzpowzgdrekyo',
    database: 'postgres',
  },
  // Transaction pooler
  {
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.xgippckdzpowzgdrekyo',
    database: 'postgres',
  },
  // Direct connection
  {
    host: 'db.xgippckdzpowzgdrekyo.supabase.co',
    port: 5432,
    user: 'postgres',
    database: 'postgres',
  },
];

async function tryConnect() {
  for (const cfg of configs) {
    for (const pw of passwords) {
      console.log(`Trying host=${cfg.host}:${cfg.port} user=${cfg.user} password=${pw.startsWith('[') ? '[...]' : 'plain'}...`);
      const client = new Client({
        ...cfg,
        password: pw,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 7000,
      });
      try {
        await client.connect();
        console.log(`>>> SUCCESS with host=${cfg.host}:${cfg.port} user=${cfg.user} password=${pw.startsWith('[') ? '[...]' : 'plain'}!`);
        return { client, cfg, password: pw };
      } catch (err) {
        console.log(`Failed: ${err.message}`);
        await client.end().catch(() => {});
      }
    }
  }
  return null;
}

const sql = `
-- Drop existing views/tables if needed or create if not exists
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Admin users table for login details in DB
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert admin user (isanka / tharindu)
INSERT INTO admin_users (username, password, full_name, role)
VALUES ('isanka', 'tharindu', 'Isanka (Admin)', 'admin')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password;

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

-- Disable RLS or grant access so frontend anon client can read/write
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE clients TO anon, authenticated, service_role;
GRANT ALL ON TABLE projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE admin_users TO anon, authenticated, service_role;
GRANT ALL ON project_payment_summary TO anon, authenticated, service_role;

-- Seed clients if empty
INSERT INTO clients (name, email, phone, address)
SELECT 'Nimal Perera', 'nimal@gmail.com', '0771234567', 'No 12, Galle Road, Colombo 03'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Nimal Perera');

INSERT INTO clients (name, email, phone, address)
SELECT 'Sunil Fernando', 'sunil@gmail.com', '0712345678', 'No 45, Kandy Road, Kurunegala'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Sunil Fernando');

INSERT INTO clients (name, email, phone, address)
SELECT 'Kamala Silva', 'kamala@gmail.com', '0761234567', 'No 7, Temple Road, Kandy'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Kamala Silva');

-- Seed projects if empty
INSERT INTO projects (client_id, project_name, project_type, description, status, total_amount, start_date, end_date)
SELECT c.id, 'Modern 2-Story Residence', 'House Design & Planning', 'Complete architectural design and planning for a modern 2-story house with 4 bedrooms.', 'Active', 850000.00, '2026-01-15', '2026-06-30'
FROM clients c WHERE c.name = 'Nimal Perera'
AND NOT EXISTS (SELECT 1 FROM projects WHERE project_name = 'Modern 2-Story Residence');

INSERT INTO projects (client_id, project_name, project_type, description, status, total_amount, start_date, end_date)
SELECT c.id, 'Traditional Villa Design', 'House Design & Planning', 'Traditional Sri Lankan style villa with modern amenities.', 'Active', 1200000.00, '2026-02-01', '2026-09-30'
FROM clients c WHERE c.name = 'Sunil Fernando'
AND NOT EXISTS (SELECT 1 FROM projects WHERE project_name = 'Traditional Villa Design');

-- Seed payments if empty
INSERT INTO payments (project_id, client_id, amount, payment_date, payment_method, reference_number, notes)
SELECT p.id, p.client_id, 250000.00, '2026-02-10', 'Bank Transfer', 'TXN-2026-001', 'Initial deposit'
FROM projects p WHERE p.project_name = 'Modern 2-Story Residence'
AND NOT EXISTS (SELECT 1 FROM payments pm WHERE pm.project_id = p.id);

INSERT INTO payments (project_id, client_id, amount, payment_date, payment_method, reference_number, notes)
SELECT p.id, p.client_id, 150000.00, '2026-04-05', 'Cash', NULL, 'Second installment'
FROM projects p WHERE p.project_name = 'Modern 2-Story Residence'
AND (SELECT COUNT(*) FROM payments pm WHERE pm.project_id = p.id) < 2;
`;

async function main() {
  const result = await tryConnect();
  if (!result) {
    console.error('Could not connect to Supabase database with provided credentials.');
    process.exit(1);
  }
  const { client } = result;
  try {
    console.log('Pushing database schema, admin_users table, and seed data to Supabase...');
    await client.query(sql);
    console.log('✅ Successfully pushed database schema, tables, and admin login details!');
  } catch (err) {
    console.error('Error running SQL:', err.message);
  } finally {
    await client.end();
  }
}

main();
