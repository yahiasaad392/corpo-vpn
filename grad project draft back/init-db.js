const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'gradprojfb',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function run() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database');

    // Create minimal users table (based on friend's server.js logic)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        failed_attempts INT DEFAULT 0,
        lock_until TIMESTAMPTZ
      )
    `);

    // Create minimal otp_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        last_sent TIMESTAMPTZ NOT NULL
      )
    `);

    console.log('✅ Tables created successfully');

    // Create VPN Policies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vpn_policies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        max_users INT NOT NULL DEFAULT 10,
        session_timeout INT NOT NULL DEFAULT 3600,
        emails TEXT[] NOT NULL DEFAULT '{}',
        critical_checks TEXT[] NOT NULL DEFAULT '{}',
        warning_checks TEXT[] NOT NULL DEFAULT '{}',
        info_checks TEXT[] NOT NULL DEFAULT '{}',
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ VPN Policies table created successfully');

    // Seed the admin user from env vars
    const email = process.env.ADMIN_EMAIL;
    const rawPass = process.env.SEED_PASSWORD;
    if (!email || !rawPass) {
      console.log('⚠️  ADMIN_EMAIL or SEED_PASSWORD not set in .env — skipping seed user.');
      client.release();
      return;
    }
    const hash = await bcrypt.hash(rawPass, 10);

    const check = await client.query('SELECT * FROM users WHERE email=$1', [email]);
    if (check.rows.length === 0) {
      await client.query(
        'INSERT INTO users(email, password_hash) VALUES($1, $2)',
        [email, hash]
      );
      console.log('✅ First auto user inserted into the database!');
    } else {
      await client.query(
        'UPDATE users SET password_hash=$1 WHERE email=$2',
        [hash, email]
      );
      console.log('✅ User already existed, password updated.');
    }

    client.release();
  } catch (err) {
    console.error('❌ Error during database init:', err);
  } finally {
    await pool.end();
  }
}

run();
