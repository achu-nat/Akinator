import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function POST(req) {
    try {
        const user = authenticate(req);
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Invalid password input' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [user.userId]
        );

        const valid = await bcrypt.compare(
            currentPassword,
            result.rows[0].password_hash
        );

        if (!valid) {
            return NextResponse.json(
                { error: 'Current password incorrect' },
                { status: 401 }
            );
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newHash, user.userId]
        );

        return NextResponse.json({ message: 'Password changed successfully' });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
