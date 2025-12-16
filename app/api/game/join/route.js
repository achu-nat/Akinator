import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function POST(req) {
    try {
        const user = authenticate(req);
        const { code } = await req.json();

        // Find game
        const game = await pool.query('SELECT * FROM games WHERE game_code = $1', [code.toUpperCase()]);
        
        if (game.rows.length === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        if (game.rows[0].status !== 'waiting') return NextResponse.json({ error: 'Game already full' }, { status: 400 });

        // Join
        await pool.query(
            `UPDATE games SET guest_id = $1, status = 'active' WHERE id = $2`,
            [user.userId, game.rows[0].id]
        );

        return NextResponse.json({ success: true, gameId: game.rows[0].id });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to join' }, { status: 500 });
    }
}