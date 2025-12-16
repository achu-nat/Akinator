import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- DATA FROM OPEN AKINATOR ---
const PERSONS_DATA = `15
All Yes
14
All No
13
You
4
Hatsune Miku
8
Rick Astley
10
Tom Lehrer
7
Joseph Joestar
10
Karl Theodor Wilhelm Weierstrass
5
Carl Gauss
2
Gentoo user
2
Andrey Victorovich Stolyarov
6
Eduard Khil
5
Ada Lovelace
4
Eric Rosen
3
Hikaru Nakamura
2`;

const QUESTIONS_DATA = `14
Is this person real?
10 1 1 1 4 4 1 2 2 1 3 3 12 11 10 
1 12 1 8 1 1 5 1 1 1 1 1 1 1 1 
Is this person male?
9 1 1 1 9 4 5 5 5 1 3 3 1 11 9 
1 12 1 9 1 1 1 1 1 1 1 1 12 1 1 
Is this person mathematician?
11 1 1 1 1 4 1 2 2 1 3 1 12 1 1 
1 9 1 10 9 1 5 1 1 1 1 3 1 11 10 
Is this person singer?
11 1 1 10 9 4 1 1 1 1 1 3 1 1 1 
1 12 1 1 1 1 5 2 2 1 3 1 12 11 10 
Has this person apeared in memes often?
11 1 1 1 30 1 4 1 1 1 1 3 1 1 10 
1 12 1 11 1 4 1 2 2 1 3 1 4 11 1 
Has your person appeared in anime?
11 1 1 11 2 1 12 1 1 1 1 1 1 1 1 
1 12 1 1 10 4 1 2 2 1 3 3 12 11 9 
Has your person driven a plane?
11 1 1 1 1 1 11 1 1 1 1 1 1 1 1 
1 11 1 10 10 4 1 2 2 1 3 3 12 10 10 
Was this person born in Germany?
1 1 1 1 2 1 1 9 2 1 1 1 1 1 1 
1 1 1 10 10 4 1 1 1 1 3 3 12 11 10 
Is this person known for his satires?
1 1 1 1 1 11 1 1 1 1 1 1 1 1 1 
1 1 1 5 5 1 1 1 2 1 3 3 12 2 10 
Is your person a programmer?
1 1 1 1 1 1 1 1 1 1 3 1 12 1 1 
1 1 1 3 3 2 1 1 2 1 1 3 1 6 5 
Is this person known to have strong philosophy about freedom?
1 1 1 1 1 2 1 1 2 1 10 3 2 2 1 
1 1 1 2 2 2 1 1 2 1 1 3 3 2 2 
Is your person a professional chess player?
1 1 1 1 1 1 1 1 1 1 1 1 1 11 10 
1 1 1 10 10 2 1 1 2 1 2 3 3 1 1 
Was this person born in Russia?
1 1 1 1 1 1 1 1 1 1 2 10 1 1 1 
1 1 1 10 10 3 1 1 2 1 1 1 4 2 10 
Is this person a chess grandmaster?
1 1 1 1 1 1 1 1 1 1 1 1 1 1 10 
1 1 1 2 2 2 1 1 2 1 2 1 3 10 1`;

async function main() {
    try {
        console.log("🔌 Connecting to Database...");
        
        // 1. SETUP SCHEMA
        console.log("🛠️  Creating Tables...");
        await pool.query(`
            DROP TABLE IF EXISTS character_question_stats CASCADE;
            DROP TABLE IF EXISTS games CASCADE;
            DROP TABLE IF EXISTS questions CASCADE;
            DROP TABLE IF EXISTS characters CASCADE;
            -- Keep users table so we don't delete your login!
            
            CREATE TABLE characters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                popularity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE questions (
                id SERIAL PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE character_question_stats (
                character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
                question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
                yes_count INTEGER DEFAULT 0,
                no_count INTEGER DEFAULT 0,
                PRIMARY KEY (character_id, question_id)
            );
            
            -- Re-create games table with new columns
            CREATE TABLE games (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                score INTEGER NOT NULL DEFAULT 0,
                current_odds JSONB,
                asked_questions JSONB DEFAULT '[]',
                status VARCHAR(20) DEFAULT 'active',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
        `);

        // 2. PARSE AND INSERT CHARACTERS
        console.log("👤 Inserting Characters...");
        const pLines = PERSONS_DATA.trim().split('\n');
        const numPersons = parseInt(pLines[0]);
        const persons = [];
        
        let pIdx = 1;
        for (let i = 0; i < numPersons; i++) {
            const name = pLines[pIdx++];
            const popularity = parseInt(pLines[pIdx++]);
            
            const res = await pool.query(
                'INSERT INTO characters (name, popularity) VALUES ($1, $2) RETURNING id',
                [name, popularity]
            );
            persons.push({ id: res.rows[0].id, name });
        }
        console.log(`   -> Added ${persons.length} characters.`);

        // 3. PARSE AND INSERT QUESTIONS + STATS
        console.log("❓ Inserting Questions & Logic...");
        const qLines = QUESTIONS_DATA.trim().split('\n');
        const numQuestions = parseInt(qLines[0]);
        
        let qIdx = 1;
        for (let i = 0; i < numQuestions; i++) {
            const text = qLines[qIdx++];
            const yesCounts = qLines[qIdx++].trim().split(' ').map(Number);
            const noCounts = qLines[qIdx++].trim().split(' ').map(Number);
            
            // Insert Question
            const res = await pool.query(
                'INSERT INTO questions (text) VALUES ($1) RETURNING id',
                [text]
            );
            const questionId = res.rows[0].id;
            
            // Insert Stats for each character
            for (let j = 0; j < persons.length; j++) {
                await pool.query(
                    `INSERT INTO character_question_stats 
                     (character_id, question_id, yes_count, no_count) 
                     VALUES ($1, $2, $3, $4)`,
                    [persons[j].id, questionId, yesCounts[j], noCounts[j]]
                );
            }
        }
        console.log(`   -> Added ${numQuestions} questions and linked stats.`);

        console.log("✅ SUCCESS! Database is ready for the game.");
        process.exit(0);
        
    } catch (e) {
        console.error("❌ ERROR:", e);
        process.exit(1);
    }
}

main();