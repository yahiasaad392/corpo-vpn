const { Pool } = require('pg');
require('dotenv').config();

async function test(name) {
  console.log(`Testing ${name}...`);
  const p = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: name,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    connectionTimeoutMillis: 5000,
  });
  try {
    const c = await p.connect();
    console.log(`✅ SUCCESS: Connected to ${name}`);
    c.release();
    return true;
  } catch (e) {
    console.log(`❌ FAIL: ${name} - ${e.message}`);
    return false;
  } finally {
    await p.end();
  }
}

async function run() {
  await test('gradprojdb');
  await test('gradprojfb');
  await test('postgres');
}

run();
