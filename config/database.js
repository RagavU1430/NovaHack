const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

async function initDB() {
    const client = await pool.connect();
    try {
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
        console.error('Database Initialization Error:', err);
    } finally {
        client.release();
    }
}

// Auto-run init
initDB();

module.exports = {
    query: (text, params) => pool.query(text, params),
};
