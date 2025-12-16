import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    try {
        const user = authenticate(req);

        // Find the most recent 'active' game where the user is host and there is no guest
        const result = await pool.query(
            `SELECT id FROM games 
             WHERE host_id = $1 
             AND guest_id IS NULL 
             AND status = 'active'
             ORDER BY updated_at DESC
             LIMIT 1`,
            [user.userId]
        );

        if (result.rows.length > 0) {
            return NextResponse.json({ gameId: result.rows[0].id });
        }
        
        return NextResponse.json({ gameId: null });
    } catch (e) {
        return NextResponse.json({ error: 'Error checking active game' }, { status: 500 });
    }
}