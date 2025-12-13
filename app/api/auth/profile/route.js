import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    try {
        const user = authenticate(req);

        const result = await pool.query(
            `SELECT id, username, email, best_score, games_played, created_at
       FROM users
       WHERE id = $1`,
            [user.userId]
        );

        if (!result.rows.length) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
