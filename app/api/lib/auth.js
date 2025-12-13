import jwt from 'jsonwebtoken';

export function authenticate(req) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) throw new Error('No token');

    return jwt.verify(token, process.env.JWT_SECRET);
}
