import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public pool: Pool;

  onModuleInit() {
    console.log('--- Connecting to PG ---');
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432'),
      // ── Connection resilience for remote VPS ──
      max: 10,                      // max pool size
      idleTimeoutMillis: 30000,     // close idle connections after 30s
      connectionTimeoutMillis: 10000, // fail fast if can't connect in 10s
      keepAlive: true,              // TCP keep-alive to prevent drops
      keepAliveInitialDelayMillis: 10000,
    });

    // ── Global error handler — prevents ECONNRESET from crashing the app ──
    this.pool.on('error', (err) => {
      console.error('⚠️ PostgreSQL pool background error (non-fatal):', err.message);
      // The pool will automatically replace the broken connection
    });
    
    this.pool.connect()
      .then(client => {
        console.log(`✅ PostgreSQL Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
        client.release();
      })
      .catch(err => {
        console.error('❌ PostgreSQL Connection FAILED:', err.message);
      });
  }

  onModuleDestroy() {
    this.pool.end();
  }
}

