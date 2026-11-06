import pkg from 'pg';
const { Client } = pkg;

const connectionString =
  'postgresql://postgres.xgippckdzpowzgdrekyo:Manamiash%402003@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function clearData() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database...');

    // Check counts before
    const before = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM clients) as clients_count,
        (SELECT COUNT(*) FROM projects) as projects_count,
        (SELECT COUNT(*) FROM payments) as payments_count,
        (SELECT COUNT(*) FROM admin_users) as admin_users_count;
    `);
    console.log('Row counts before deletion:', before.rows[0]);

    // Truncate tables with CASCADE
    await client.query('TRUNCATE TABLE payments, projects, clients CASCADE;');
    console.log('Truncated payments, projects, clients.');

    // Check counts after
    const after = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM clients) as clients_count,
        (SELECT COUNT(*) FROM projects) as projects_count,
        (SELECT COUNT(*) FROM payments) as payments_count,
        (SELECT COUNT(*) FROM admin_users) as admin_users_count;
    `);
    console.log('Row counts after deletion:', after.rows[0]);
    console.log('✅ All fake data removed successfully. Admin users intact!');
  } catch (err) {
    console.error('Error clearing data:', err.message);
  } finally {
    await client.end();
  }
}

clearData();
