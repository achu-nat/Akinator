import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log("🔌 Connecting to Database...");
        
        // We drop the old game tables and creating new ones for 2048
        await pool.query(`
            DROP TABLE IF EXISTS character_question_stats CASCADE;
            DROP TABLE IF EXISTS games CASCADE;
            DROP TABLE IF EXISTS questions CASCADE;
            DROP TABLE IF EXISTS characters CASCADE;
            
            -- Users table stays the same (keeps your login!)
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                best_score INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- New Games Table for 2048
            CREATE TABLE games (
                id SERIAL PRIMARY KEY,
                game_code VARCHAR(10) UNIQUE NOT NULL, -- The Room Code (e.g. "ABCD")
                host_id INTEGER REFERENCES users(id),
                guest_id INTEGER REFERENCES users(id), -- The second player
                
                board_state JSONB NOT NULL,            -- The 4x4 Grid
                score INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'waiting',  -- 'waiting', 'active', 'over'
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ SUCCESS! Database updated for 2048.");
        process.exit(0);
    } catch (e) {
        console.error("❌ ERROR:", e);
        process.exit(1);
    }
}

main();