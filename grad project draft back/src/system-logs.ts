import { Pool } from 'pg';

// ── In-memory buffer for fast access + DB persistence ──
// Logs are written to both memory (for console output) and PostgreSQL (for persistence)
let dbPool: Pool | null = null;
let dbReady = false;
let pendingLogs: { time: string; level: string; message: string }[] = [];

/**
 * Initialize the system logs table and set the DB pool reference.
 * Called once from main.ts after the NestJS app is created.
 */
export async function initSystemLogs(pool: Pool) {
  dbPool = pool;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        level VARCHAR(20) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL
      )
    `);

    // Create an index on time for fast "last 7 days" queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_logs_time ON system_logs (time DESC)
    `);

    dbReady = true;

    // Flush any logs that were buffered before DB was ready
    if (pendingLogs.length > 0) {
      for (const log of pendingLogs) {
        await insertLog(log.time, log.level, log.message);
      }
      pendingLogs = [];
    }
  } catch (err) {
    // If table creation fails, logs will still go to console/Render
    console.error('[SystemLogs] Failed to initialize system_logs table:', err.message);
  }
}

/**
 * Insert a single log entry into the database.
 */
async function insertLog(time: string, level: string, message: string) {
  if (!dbPool || !dbReady) return;
  try {
    await dbPool.query(
      'INSERT INTO system_logs (time, level, message) VALUES ($1, $2, $3)',
      [time, level, message],
    );
  } catch {
    // Silently fail — we don't want logging failures to crash the app
  }
}

/**
 * Fetch logs from the database for the past N days.
 */
export async function getPersistedLogs(days: number = 7): Promise<any[]> {
  if (!dbPool || !dbReady) return [];
  try {
    const result = await dbPool.query(
      `SELECT id, time, level, message FROM system_logs
       WHERE time >= NOW() - INTERVAL '1 day' * $1
       ORDER BY time ASC`,
      [days],
    );
    return result.rows;
  } catch (err) {
    console.error('[SystemLogs] Failed to fetch logs:', err.message);
    return [];
  }
}

/**
 * Hijack console.log / .error / .warn to persist every log to the database.
 * This must be called BEFORE initSystemLogs — early logs are buffered.
 */
export function hijackConsole() {
  const ogLog = console.log;
  const ogError = console.error;
  const ogWarn = console.warn;

  const addLog = (level: string, ...args: any[]) => {
    const msg = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ');
    const time = new Date().toISOString();

    if (dbReady) {
      insertLog(time, level, msg);
    } else {
      // Buffer until DB is ready (max 500 to prevent memory issues on slow startup)
      if (pendingLogs.length < 500) {
        pendingLogs.push({ time, level, message: msg });
      }
    }
  };

  console.log = (...args) => {
    ogLog(...args);
    addLog('info', ...args);
  };
  console.error = (...args) => {
    ogError(...args);
    addLog('error', ...args);
  };
  console.warn = (...args) => {
    ogWarn(...args);
    addLog('warning', ...args);
  };
}
