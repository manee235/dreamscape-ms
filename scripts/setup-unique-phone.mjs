import pkg from 'pg';
const { Client } = pkg;

const connectionString =
  'postgresql://postgres.xgippckdzpowzgdrekyo:Manamiash%402003@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function setupPhoneUnique() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase...');

    // Add unique constraint on phone if not exists
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_unique_idx ON clients (phone) WHERE phone IS NOT NULL AND phone != '';
    `);
    console.log('✅ Unique index on clients.phone created successfully!');
  } catch (err) {
    console.log('Note on unique index:', err.message);
  } finally {
    await client.end();
  }
}

setupPhoneUnique();

