const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gradprojdb',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function setup() {
  try {
    const client = await pool.connect();
    console.log('--- Connected to gradprojdb ---');

    console.log('Creating auth_users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        failed_attempts INT DEFAULT 0,
        lock_until TIMESTAMPTZ
      )
    `);

    console.log('Creating auth_otp_codes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        last_sent TIMESTAMPTZ NOT NULL
      )
    `);

    console.log('✅ Tables created successfully!');
    client.release();
  } catch (err) {
    console.error('❌ Setup Error:', err.message);
  } finally {
    await pool.end();
  }
}

setup();
