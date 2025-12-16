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
        console.log("🗑️  NUKING DATABASE...");
        
\        await pool.query(`
            DROP TABLE IF EXISTS games CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            
            -- Recreate Users
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                best_score INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Recreate Games (With new Race Mode columns)
            CREATE TABLE games (
                id SERIAL PRIMARY KEY,
                game_code VARCHAR(10) UNIQUE NOT NULL,
                
                host_id INTEGER REFERENCES users(id),
                guest_id INTEGER REFERENCES users(id),
                
                host_board JSONB NOT NULL,
                guest_board JSONB,
                
                host_score INTEGER DEFAULT 0,
                guest_score INTEGER DEFAULT 0,
                
                game_mode VARCHAR(20) DEFAULT 'solo',
                time_limit INTEGER DEFAULT 0,
                
                status VARCHAR(20) DEFAULT 'waiting',
                start_time TIMESTAMP,
                winner_id INTEGER REFERENCES users(id),
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Database completely reset! All data is gone.");
        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
}

main();