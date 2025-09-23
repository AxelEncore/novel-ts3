const { Pool } = require('pg');
require('dotenv').config();

async function checkSchema() {
  const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'encore_tasks',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: process.env.POSTGRES_PORT || 5432,
  });

  try {
    console.log('Available tables:');
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
    console.log(tables.rows);
    
    if (tables.rows.some(t => t.table_name === 'users')) {
      console.log('\nUsers table schema:');
      const schema = await pool.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;`);
      console.log(schema.rows);
      
      console.log('\nSample user data:');
      const users = await pool.query('SELECT id, username, email FROM users LIMIT 3');
      console.log(users.rows);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();