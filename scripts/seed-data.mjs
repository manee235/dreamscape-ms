import pkg from 'pg';
const { Client } = pkg;

const connectionString =
  'postgresql://postgres.xgippckdzpowzgdrekyo:Manamiash%402003@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function seed() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to DB...');

    // Clean & insert rich clients
    const c1 = await client.query(`
      INSERT INTO clients (name, email, phone, address) VALUES
      ('Nimal Perera', 'nimal.p@gmail.com', '0771234567', 'No 14, Galle Road, Colombo 03'),
      ('Sunil Fernando', 'sunil.f@outlook.com', '0718923456', 'No 45, Kandy Road, Kurunegala'),
      ('Dr. Anura Senanayake', 'anura.doc@gmail.com', '0763456789', 'No 82, Peradeniya Road, Kandy'),
      ('Dilani Wickramasinghe', 'dilani.w@yahoo.com', '0724567890', 'No 21, Negombo Road, Wattala'),
      ('Kasun Jayawardena', 'kasun.j@gmail.com', '0756781234', 'No 7, Temple Road, Gampaha')
      RETURNING id, name;
    `);
    console.log('Clients inserted:', c1.rows.length);

    const clientMap = {};
    c1.rows.forEach(r => { clientMap[r.name] = r.id; });

    // Insert Projects
    const p1 = await client.query(`
      INSERT INTO projects (client_id, project_name, project_type, description, status, total_amount, start_date, end_date) VALUES
      ('${clientMap['Nimal Perera']}', 'Modern 2-Story Luxury Residence', 'House Design & Planning', '4 Bedroom modern minimalist house plan with rooftop garden and infinity pool.', 'Active', 1250000.00, '2026-01-10', '2026-08-30'),
      ('${clientMap['Sunil Fernando']}', 'Traditional Tropical Villa', 'House Design & Planning', 'Open courtyard concept with Geoffrey Bawa inspired tropical architecture.', 'Active', 950000.00, '2026-02-01', '2026-09-15'),
      ('${clientMap['Dr. Anura Senanayake']}', 'Colonial Bungalow Renovation & Plan', 'Renovation Design', 'Restoration and interior modernization of 80-year-old colonial manor.', 'Active', 1600000.00, '2026-01-20', '2026-11-30'),
      ('${clientMap['Dilani Wickramasinghe']}', 'Contemporary 3-Bedroom Villa', 'House Design & Planning', 'Energy efficient compact luxury home for a young family.', 'Completed', 750000.00, '2025-09-01', '2026-02-28'),
      ('${clientMap['Kasun Jayawardena']}', 'Eco-Friendly Compact Residence', 'Landscape & House Design', 'Sustainable timber and glass residence with integrated landscaping.', 'On Hold', 850000.00, '2026-03-05', '2026-12-15')
      RETURNING id, project_name, client_id;
    `);
    console.log('Projects inserted:', p1.rows.length);

    const projectMap = {};
    p1.rows.forEach(r => { projectMap[r.project_name] = { id: r.id, client_id: r.client_id }; });

    // Insert Payments
    await client.query(`
      INSERT INTO payments (project_id, client_id, amount, payment_date, payment_method, reference_number, notes) VALUES
      -- Nimal Perera (Total: 1,250,000 | Paid: 850,000 | Rem: 400,000)
      ('${projectMap['Modern 2-Story Luxury Residence'].id}', '${projectMap['Modern 2-Story Luxury Residence'].client_id}', 500000.00, '2026-01-15', 'Bank Transfer', 'BOC-TXN-9021', 'Initial architectural advance payment'),
      ('${projectMap['Modern 2-Story Luxury Residence'].id}', '${projectMap['Modern 2-Story Luxury Residence'].client_id}', 350000.00, '2026-02-28', 'Online Transfer', 'HNB-FT-4412', 'Second stage detailed drawing milestone'),
      
      -- Sunil Fernando (Total: 950,000 | Paid: 600,000 | Rem: 350,000)
      ('${projectMap['Traditional Tropical Villa'].id}', '${projectMap['Traditional Tropical Villa'].client_id}', 400000.00, '2026-02-05', 'Cheque', 'CHQ-88091', 'Advance for concept design'),
      ('${projectMap['Traditional Tropical Villa'].id}', '${projectMap['Traditional Tropical Villa'].client_id}', 200000.00, '2026-03-12', 'Cash', NULL, 'Site evaluation and structural design fee'),
      
      -- Dr. Anura Senanayake (Total: 1,600,000 | Paid: 1,000,000 | Rem: 600,000)
      ('${projectMap['Colonial Bungalow Renovation & Plan'].id}', '${projectMap['Colonial Bungalow Renovation & Plan'].client_id}', 600000.00, '2026-01-25', 'Bank Transfer', 'COM-TXN-1092', 'Contract signing deposit'),
      ('${projectMap['Colonial Bungalow Renovation & Plan'].id}', '${projectMap['Colonial Bungalow Renovation & Plan'].client_id}', 400000.00, '2026-03-01', 'Bank Transfer', 'COM-TXN-2219', 'MEP and 3D rendering milestone'),

      -- Dilani Wickramasinghe (Total: 750,000 | Paid: 750,000 | Fully Paid!)
      ('${projectMap['Contemporary 3-Bedroom Villa'].id}', '${projectMap['Contemporary 3-Bedroom Villa'].client_id}', 350000.00, '2025-09-10', 'Bank Transfer', 'SAMP-TXN-881', 'Deposit'),
      ('${projectMap['Contemporary 3-Bedroom Villa'].id}', '${projectMap['Contemporary 3-Bedroom Villa'].client_id}', 400000.00, '2026-02-25', 'Cheque', 'CHQ-00129', 'Final settlement on completion'),

      -- Kasun Jayawardena (Total: 850,000 | Paid: 350,000 | Rem: 500,000)
      ('${projectMap['Eco-Friendly Compact Residence'].id}', '${projectMap['Eco-Friendly Compact Residence'].client_id}', 350000.00, '2026-03-08', 'Cash', NULL, 'Preliminary design deposit');
    `);

    console.log('✅ Rich seed data inserted successfully!');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await client.end();
  }
}

seed();
