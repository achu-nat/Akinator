import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    try {
        const user = authenticate(req);
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get('id');

        const result = await pool.query(
            `SELECT g.*, u1.username as host_name, u2.username as guest_name 
             FROM games g
             LEFT JOIN users u1 ON g.host_id = u1.id
             LEFT JOIN users u2 ON g.guest_id = u2.id
             WHERE g.id = $1`,
            [gameId]
        );

        if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json(result.rows[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}