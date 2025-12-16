import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { move, isGameOver } from '@/lib/game2048';

export async function POST(req) {
    try {
        const user = authenticate(req);
        const { gameId, direction } = await req.json();

        // 1. Get current board
        const gameRes = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
        const game = gameRes.rows[0];
        
        if (game.status === 'over') return NextResponse.json({ error: 'Game over' });

        // 2. Calculate new board
        const currentBoard = game.board_state;
        const result = move(currentBoard, direction);

        if (!result.moved) return NextResponse.json({ success: false }); // Invalid move

        const newScore = game.score + result.score;
        let newStatus = game.status;

        // 3. Check Game Over
        if (isGameOver(result.board)) {
            newStatus = 'over';
            
            // Update High Scores for both players
            await pool.query(
                `UPDATE users SET best_score = GREATEST(best_score, $1), games_played = games_played + 1 
                 WHERE id IN ($2, $3)`,
                [newScore, game.host_id, game.guest_id]
            );
        }

        // 4. Save to DB
        await pool.query(
            `UPDATE games SET board_state = $1, score = $2, status = $3, updated_at = NOW() WHERE id = $4`,
            [JSON.stringify(result.board), newScore, newStatus, gameId]
        );

        return NextResponse.json({ success: true, board: result.board });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Move failed' }, { status: 500 });
    }
}