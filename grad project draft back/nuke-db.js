const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gradprojdb',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function nukeAndRebuild() {
  try {
    const client = await pool.connect();
    console.log('--- Connected to DB for Nuking old tables ---');

    // List of tables seen in the screenshot
    const tables = [
      'audit_logs', 'compliance_checks', 'compliance_policies', 
      'compliance_reports', 'devices', 'organizations', 
      'otp_codes', 'server_config', 'users', 
      'vpn_sessions', 'website_rules'
    ];

    for (const table of tables) {
      console.log(`Dropping table ${table}...`);
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    console.log('✅ All old tables dropped.');

    // Create the new simplified tables
    console.log('Creating simplified users table...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        failed_attempts INT DEFAULT 0,
        lock_until TIMESTAMPTZ
      )
    `);

    console.log('Creating simplified otp_codes table...');
    await client.query(`
      CREATE TABLE otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        last_sent TIMESTAMPTZ NOT NULL
      )
    `);

    // Seed the user
    const bcrypt = require('bcrypt');
    const seedEmail = process.env.ADMIN_EMAIL;
    const seedPass = process.env.SEED_PASSWORD;
    if (!seedEmail || !seedPass) {
      console.log('⚠️  ADMIN_EMAIL or SEED_PASSWORD not set in .env — skipping seed user.');
    } else {
      const hash = await bcrypt.hash(seedPass, 10);
      await client.query(
        'INSERT INTO users(email, password_hash) VALUES($1, $2)',
        [seedEmail, hash]
      );
      console.log(`✅ Fresh Database Ready with seeded user: ${seedEmail}`);
    }

    client.release();
  } catch (err) {
    console.error('❌ Nuke Error:', err.message);
  } finally {
    await pool.end();
  }
}

nukeAndRebuild();
