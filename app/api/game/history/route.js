import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    try {
        const user = authenticate(req);
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit')) || 10;

        const result = await pool.query(
            `SELECT id, score, started_at, completed_at
       FROM games
       WHERE user_id = $1
       ORDER BY completed_at DESC
       LIMIT $2`,
            [user.userId, limit]
        );

        return NextResponse.json({ games: result.rows });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
