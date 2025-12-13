import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function POST(req) {
    try {
        const user = authenticate(req);
        const { gameId, score } = await req.json();

        await pool.query(
            `UPDATE games
       SET score = $1, completed_at = NOW()
       WHERE id = $2 AND user_id = $3`,
            [score, gameId, user.userId]
        );

        await pool.query(
            `UPDATE users
       SET best_score = GREATEST(best_score, $1),
           games_played = games_played + 1
       WHERE id = $2`,
            [score, user.userId]
        );

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to end game' }, { status: 500 });
    }
}
