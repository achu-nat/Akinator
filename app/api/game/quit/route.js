import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function POST(req) {
    try {
        const user = authenticate(req);
        const { gameId } = await req.json();

        // Get game info
        const gameRes = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if (gameRes.rows.length === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        
        const game = gameRes.rows[0];

        // Authorization check
        if (game.host_id !== user.userId && game.guest_id !== user.userId) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Logic:
        // If Collab (guest_id exists): Mark as 'over' to discard it.
        // If Solo (guest_id is null): Do nothing. State is already saved in DB.
        
        if (game.guest_id) {
            await pool.query(
                `UPDATE games SET status = 'over' WHERE id = $1`,
                [gameId]
            );
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to quit' }, { status: 500 });
    }
}