import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function POST(req) {
    try {
        const user = authenticate(req);

        const result = await pool.query(
            `INSERT INTO games (user_id)
       VALUES ($1)
       RETURNING id, started_at`,
            [user.userId]
        );

        return NextResponse.json(result.rows[0]);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
