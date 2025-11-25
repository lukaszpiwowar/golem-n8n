const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Parse DATABASE_URL manually to handle special characters in password
// Format: postgresql://user:password@host:port/database
let poolConfig;
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

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create todos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on user_id for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});

