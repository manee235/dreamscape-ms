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

-- RLS: Disable for now (admin-only app)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Sample data
INSERT INTO clients (name, email, phone, address) VALUES
  ('Nimal Perera', 'nimal@gmail.com', '0771234567', 'No 12, Galle Road, Colombo 03'),
  ('Sunil Fernando', 'sunil@gmail.com', '0712345678', 'No 45, Kandy Road, Kurunegala'),
  ('Kamala Silva', 'kamala@gmail.com', '0761234567', 'No 7, Temple Road, Kandy');

INSERT INTO projects (client_id, project_name, project_type, description, status, total_amount, start_date, end_date)
SELECT 
  c.id, 'Modern 2-Story Residence', 'House Design & Planning', 
  'Complete architectural design and planning for a modern 2-story house with 4 bedrooms.', 
  'Active', 850000.00, '2026-01-15', '2026-06-30'
FROM clients c WHERE c.name = 'Nimal Perera';

INSERT INTO projects (client_id, project_name, project_type, description, status, total_amount, start_date, end_date)
SELECT 
  c.id, 'Traditional Villa Design', 'House Design & Planning',
  'Traditional Sri Lankan style villa with modern amenities.',
  'Active', 1200000.00, '2026-02-01', '2026-09-30'
FROM clients c WHERE c.name = 'Sunil Fernando';

INSERT INTO projects (client_id, project_name, project_type, description, status, total_amount, start_date, end_date)
SELECT 
  c.id, 'Luxury Bungalow Plan', 'Interior Design',
  'Luxury bungalow with pool and landscaping design.',
  'On Hold', 650000.00, '2026-03-01', '2026-12-31'
FROM clients c WHERE c.name = 'Kamala Silva';

INSERT INTO payments (project_id, client_id, amount, payment_date, payment_method, reference_number, notes)
SELECT 
  p.id, p.client_id, 250000.00, '2026-02-10', 'Bank Transfer', 'TXN-2026-001', 'Initial deposit'
FROM projects p WHERE p.project_name = 'Modern 2-Story Residence';

INSERT INTO payments (project_id, client_id, amount, payment_date, payment_method, reference_number, notes)
SELECT 
  p.id, p.client_id, 150000.00, '2026-04-05', 'Cash', NULL, 'Second installment'
FROM projects p WHERE p.project_name = 'Modern 2-Story Residence';

INSERT INTO payments (project_id, client_id, amount, payment_date, payment_method, reference_number, notes)
SELECT 
  p.id, p.client_id, 400000.00, '2026-02-20', 'Cheque', 'CHQ-0045', 'First payment'
FROM projects p WHERE p.project_name = 'Traditional Villa Design';

