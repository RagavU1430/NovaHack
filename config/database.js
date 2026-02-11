const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool(); // Use default env DATABASE_URL or other standard PG env vars if present. Or use connectionString below.

if (process.env.DATABASE_URL) {
    // Vercel / Production
    pool.options.connectionString = process.env.DATABASE_URL;
    pool.options.ssl = { rejectUnauthorized: false };
}

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

async function initDB() {
    let client;
    try {
        client = await pool.connect();
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'participant',
        currentLevel INTEGER DEFAULT 0,
        progress JSONB DEFAULT '{}',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS game_state (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        userId INTEGER,
        action VARCHAR(255),
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Session table for connect-pg-simple
        await client.query(`
        CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);
        
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);

        // Seed Initial State
        const checkState = await client.query("SELECT * FROM game_state WHERE key = 'status'");
        if (checkState.rows.length === 0) {
            await client.query("INSERT INTO game_state (key, value) VALUES ($1, $2)", ['status', JSON.stringify({ state: 'waiting' })]);
        }

        // Seed Admin
        const checkAdmin = await client.query("SELECT * FROM users WHERE role = 'admin'");
        if (checkAdmin.rows.length === 0) {
            const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
            await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ['admin', hash, 'admin']);
        }

        console.log('PostgreSQL Database Initialized.');
    } catch (err) {
        if (err.code !== '42P07') { // duplicate_table is fine (specifically for session table if already exists with diff structure)
            console.error('Database Initialization Error:', err);
        }
    } finally {
        if (client) client.release();
    }
}

// Auto-run init
initDB();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool // Export pool for connect-pg-simple
};
