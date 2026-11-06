-- ============================================================
-- Dreamscape MS - Supabase Schema
-- House Design & Planning Agency Management System
-- ============================================================

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table (each client can have multiple house design projects)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  project_type VARCHAR(100) DEFAULT 'House Design',
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active', -- Active, Completed, On Hold, Cancelled
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
  payment_method VARCHAR(100) DEFAULT 'Cash', -- Cash, Bank Transfer, Cheque, Online
  reference_number VARCHAR(255),
  notes TEXT,
  marked_by VARCHAR(255) DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin login
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

-- RLS & Permissions
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE clients TO anon, authenticated, service_role;
GRANT ALL ON TABLE projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE admin_users TO anon, authenticated, service_role;
GRANT ALL ON project_payment_summary TO anon, authenticated, service_role;
