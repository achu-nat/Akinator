import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { initBoard } from '@/lib/game2048';

export async function POST(req) {
    try {
        const user = authenticate(req);
        // Get mode from request body (default to 'collab' if not provided)
        const body = await req.json().catch(() => ({}));
        const mode = body.mode || 'collab';
        
        // Generate random 4-letter code
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const board = initBoard();

        // Determine status: Solo games start 'active', Collab games start 'waiting'
        const initialStatus = mode === 'solo' ? 'active' : 'waiting';

        const result = await pool.query(
            `INSERT INTO games (game_code, host_id, board_state, score, status)
             VALUES ($1, $2, $3, 0, $4)
             RETURNING *`, 
            [code, user.userId, JSON.stringify(board), initialStatus]
        );

        return NextResponse.json(result.rows[0]);
    } catch (e) {
        console.error(e); 
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }
}