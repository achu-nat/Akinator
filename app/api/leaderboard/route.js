import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit')) || 100, 1000);

        const result = await pool.query(
            `SELECT username, best_score, games_played
       FROM users
       WHERE best_score > 0
       ORDER BY best_score DESC, games_played ASC
       LIMIT $1`,
            [limit]
        );

        return NextResponse.json(result.rows);
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
