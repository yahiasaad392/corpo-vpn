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
    });
    
    this.pool.connect()
      .then(client => {
        console.log('✅ PostgreSQL Connected specifically to: gradprojdb');
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
