/**
 * migrate-vpn-sessions.js
 * 
 * Run this ONCE against your VPS PostgreSQL to add the vpn_sessions table
 * and ensure auth_users has WireGuard columns.
 * 
 * Usage:
 *   node migrate-vpn-sessions.js
 * 
 * This reads from your .env file (DB_HOST, DB_PORT, etc.)
 * which should already point to 80.65.211.27:3005
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'gradprojdb',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    console.log(`✅ Connected to PostgreSQL at ${process.env.DB_HOST}:${process.env.DB_PORT}`);

    // ── 1. Add WireGuard columns to auth_users (if missing) ──
    console.log('\n── Step 1: Ensuring WireGuard columns on auth_users ──');
    const wgColumns = [
      { name: 'wg_config', type: 'TEXT' },
      { name: 'wg_private_key', type: 'VARCHAR(255)' },
      { name: 'wg_address', type: 'VARCHAR(50)' },
    ];

    for (const col of wgColumns) {
      try {
        await client.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`   ✅ ${col.name} — OK`);
      } catch (e) {
        console.log(`   ⚠️  ${col.name} — ${e.message}`);
      }
    }

    // ── 2. Create vpn_sessions table ──
    console.log('\n── Step 2: Creating vpn_sessions table ──');
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
    console.log('   ✅ vpn_sessions table created');

    // ── 3. Create index for fast session lookups ──
    console.log('\n── Step 3: Creating indexes ──');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vpn_sessions_email ON vpn_sessions(user_email)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vpn_sessions_status ON vpn_sessions(session_status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vpn_sessions_connected ON vpn_sessions(connected_at DESC)
    `);
    console.log('   ✅ Indexes created');

    // ── 4. Verify ──
    console.log('\n── Step 4: Verification ──');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' ORDER BY table_name
    `);
    console.log('   Tables in database:');
    tables.rows.forEach(r => console.log(`     • ${r.table_name}`));

    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name='auth_users' AND column_name LIKE 'wg_%'
      ORDER BY ordinal_position
    `);
    console.log('\n   WireGuard columns on auth_users:');
    cols.rows.forEach(r => console.log(`     • ${r.column_name} (${r.data_type})`));

    console.log('\n🎉 Migration complete!');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
