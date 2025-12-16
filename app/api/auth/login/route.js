import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        console.log(`🔐 Login attempt for: ${email}`);

        // 1. Check if user exists
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            console.log("❌ User not found");
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const user = result.rows[0];

        // 2. Check password
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            console.log("❌ Password incorrect");
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // 3. Generate Token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log("✅ Login successful");

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                best_score: user.best_score
            }
        });

    } catch (err) {
        console.error("❌ LOGIN ERROR:", err); // <--- This will show the real error in your terminal
        return NextResponse.json({ error: 'Login failed', details: err.message }, { status: 500 });
    }
}