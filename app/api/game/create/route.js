import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { initBoard } from '@/lib/game2048';

export async function POST(req) {
    try {
        const user = authenticate(req);
        
        // Generate random 4-letter code
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const board = initBoard();

        const result = await pool.query(
            `INSERT INTO games (game_code, host_id, board_state, score, status)
             VALUES ($1, $2, $3, 0, 'waiting')
             RETURNING *`, // <--- CHANGED THIS from "RETURNING id, game_code"
            [code, user.userId, JSON.stringify(board)]
        );

        return NextResponse.json(result.rows[0]);
    } catch (e) {
        console.error(e); // Good to log the error to see what happens
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }
}