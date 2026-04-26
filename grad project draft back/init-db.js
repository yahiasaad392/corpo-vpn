const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'gradprojdb',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function run() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database');

    // ── auth_users table (with WireGuard columns) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        failed_attempts INT DEFAULT 0,
        lock_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        otp VARCHAR(10),
        otp_expires_at TIMESTAMP,
        wg_config TEXT,
        wg_private_key VARCHAR(255),
        wg_address VARCHAR(50)
      )
    `);
    console.log('✅ auth_users table ready');

    // ── auth_otp_codes table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        last_sent TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ auth_otp_codes table ready');

    // ── vpn_policies table ──
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
    console.log('✅ vpn_policies table ready');

    // ── vpn_sessions table (NEW — for connect/disconnect tracking) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS vpn_sessions (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        client_ip VARCHAR(50),
        connected_at TIMESTAMP DEFAULT NOW(),
        disconnected_at TIMESTAMP,
        compliance_status VARCHAR(20) DEFAULT 'passed',
        warning_checks TEXT[] DEFAULT '{}',
        session_status VARCHAR(20) DEFAULT 'active'
      )
    `);
    console.log('✅ vpn_sessions table ready');

    // ── Add WG columns to auth_users if they don't exist (safe migration) ──
    const wgCols = ['wg_config TEXT', 'wg_private_key VARCHAR(255)', 'wg_address VARCHAR(50)'];
    for (const col of wgCols) {
      const colName = col.split(' ')[0];
      try {
        await client.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) {
        // Column already exists — ignore
      }
    }
    console.log('✅ WireGuard columns verified on auth_users');

    // ── Seed the admin user from env vars ──
    const email = process.env.ADMIN_EMAIL;
    const rawPass = process.env.SEED_PASSWORD;
    if (!email || !rawPass) {
      console.log('⚠️  ADMIN_EMAIL or SEED_PASSWORD not set in .env — skipping seed user.');
      client.release();
      return;
    }
    const hash = await bcrypt.hash(rawPass, 10);

    const check = await client.query('SELECT * FROM auth_users WHERE email=$1', [email]);
    if (check.rows.length === 0) {
      await client.query(
        "INSERT INTO auth_users(email, password_hash, role) VALUES($1, $2, 'admin')",
        [email, hash]
      );
      console.log(`✅ Admin user seeded: ${email}`);
    } else {
      await client.query(
        'UPDATE auth_users SET password_hash=$1 WHERE email=$2',
        [hash, email]
      );
      console.log('✅ Admin user already existed, password updated.');
    }

    client.release();
    console.log('\n🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Error during database init:', err);
  } finally {
    await pool.end();
  }
}

run();

