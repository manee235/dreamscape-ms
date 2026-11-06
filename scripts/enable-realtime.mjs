import pkg from 'pg';
const { Client } = pkg;

const connectionString =
  'postgresql://postgres.xgippckdzpowzgdrekyo:Manamiash%402003@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function enableRealtime() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL...');
    
    // Enable replica identity for full change tracking and add tables to publication
    await client.query(`
      ALTER TABLE clients REPLICA IDENTITY FULL;
      ALTER TABLE projects REPLICA IDENTITY FULL;
      ALTER TABLE payments REPLICA IDENTITY FULL;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;

      ALTER PUBLICATION supabase_realtime ADD TABLE clients, projects, payments;
    `);
    console.log('✅ Supabase Realtime successfully enabled on clients, projects, payments!');
  } catch (err) {
    console.log('Note/Status on publication:', err.message);
  } finally {
    await client.end();
  }
}

enableRealtime();

