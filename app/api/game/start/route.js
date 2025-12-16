import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { calculateInitialOdds } from '@/lib/akinator';

export async function POST(req) {
    try {
        const user = authenticate(req);

        // 1. Fetch all characters
        const charResult = await pool.query('SELECT id, name, popularity FROM characters');
        
        // 2. Initialize Probabilities
        const charactersWithOdds = calculateInitialOdds(charResult.rows);

        // 3. Create Game Record
        const result = await pool.query(
            `INSERT INTO games (user_id, current_odds, status, asked_questions)
             VALUES ($1, $2, 'active', '[]')
             RETURNING id`,
            [user.userId, JSON.stringify(charactersWithOdds)]
        );

        return NextResponse.json({ gameId: result.rows[0].id });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to start' }, { status: 500 });
    }
}