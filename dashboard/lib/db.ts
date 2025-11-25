import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Parse DATABASE_URL manually to handle special characters in password
// Format: postgresql://user:password@host:port/database
let poolConfig: any;
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);

if (match) {
  const [, user, password, host, port, database] = match;
  // Disable SSL for local connections (postgres hostname)
  const isLocalConnection = host === 'postgres' || host === 'localhost' || host === '127.0.0.1';
  poolConfig = {
    host,
    port: parseInt(port) || 5432,
    database,
    user,
    password, // Password may contain special characters like #
    ssl: !isLocalConnection && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
} else {
  // Fallback: try to use connection string directly (may fail with special chars)
  console.warn('Failed to parse DATABASE_URL format, using connection string directly');
  poolConfig = {
    connectionString: dbUrl,
    ssl: false, // Disable SSL for fallback
  };
}

const pool = new Pool(poolConfig);

export default pool;

