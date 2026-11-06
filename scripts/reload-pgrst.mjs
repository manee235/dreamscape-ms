import pkg from 'pg';
const { Client } = pkg;

const connectionString =
  'postgresql://postgres.xgippckdzpowzgdrekyo:Manamiash%402003@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function reloadCache() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Postgres.');
    console.log('Sending NOTIFY pgrst to reload PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    await client.query("NOTIFY pgrst, 'reload config';");
    console.log('✅ PostgREST schema cache successfully reloaded!');
  } catch (err) {
    console.error('Error reloading schema cache:', err.message);
  } finally {
    await client.end();
  }
}

reloadCache();

