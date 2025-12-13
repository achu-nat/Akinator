/ ==============================================================================
// AKINATOR BATTLE - BACKEND SERVER
// Node.js + Express + PostgreSQL + JWT + Bcrypt
// ==============================================================================

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// ==============================================================================
// SERVER CONFIGURATION
// ==============================================================================
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Configure this in production
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// ==============================================================================
// DATABASE SETUP (PostgreSQL)
// ==============================================================================
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('   Check your DATABASE_URL in .env file');
  } else {
    console.log('✅ Database connected successfully at', res.rows[0].now);
  }
});

// Handle database errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// ==============================================================================
// AUTHENTICATION MIDDLEWARE
// ==============================================================================
const authenticateToken = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please log in to access this resource'
    });
  }

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please log in again'
      });
    }
    
    // Attach user data to request object
    req.user = user;
    next();
  });
};

// ==============================================================================
// AUTH ROUTES
// ==============================================================================

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { username, email, password }
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ============= VALIDATION =============
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'All fields are required',
        fields: { username: !username, email: !email, password: !password }
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // ============= CHECK IF USER EXISTS =============
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Email already registered',
        message: 'Please use a different email or try logging in'
      });
    }

    // Check if username is taken
    const existingUsername = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Username already taken',
        message: 'Please choose a different username'
      });
    }

    // ============= HASH PASSWORD =============
    // Bcrypt automatically generates a salt and includes it in the hash
    const saltRounds = 10; // Higher = more secure but slower (10 is standard)
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ============= CREATE USER =============
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, best_score, games_played, created_at)
       VALUES ($1, $2, $3, 0, 0, NOW())
       RETURNING id, username, email, best_score, games_played, created_at`,
      [username, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // ============= GENERATE JWT TOKEN =============
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token valid for 7 days
    );

    // ============= SEND RESPONSE =============
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        best_score: user.best_score,
        games_played: user.games_played,
        created_at: user.created_at
      }
    });

    console.log(`✅ New user registered: ${username} (${email})`);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Server error during registration',
      message: 'Please try again later'
    });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 * Body: { email, password }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ============= VALIDATION =============
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // ============= FIND USER =============
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        message: 'Please check your credentials'
      });
    }

    const user = result.rows[0];

    // ============= VERIFY PASSWORD =============
    // Bcrypt compares the plain password with the hashed password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        message: 'Please check your credentials'
      });
    }

    // ============= GENERATE JWT TOKEN =============
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ============= SEND RESPONSE =============
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        best_score: user.best_score,
        games_played: user.games_played,
        created_at: user.created_at
      }
    });

    console.log(`✅ User logged in: ${user.username}`);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error during login',
      message: 'Please try again later'
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user's profile (PROTECTED)
 * Requires: Authorization header with JWT token
 */
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, best_score, games_played, created_at
       FROM users 
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password (PROTECTED)
 * Body: { currentPassword, newPassword }
 */
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current and new passwords required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters' 
      });
    }

    // Get current user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    const user = userResult.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.userId]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password' 
    });
  }
});

// ==============================================================================
// GAME ROUTES
// ==============================================================================

/**
 * POST /api/game/start
 * Start a new game (PROTECTED)
 * Creates a game record in database
 */
app.post('/api/game/start', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO games (user_id, score, started_at)
       VALUES ($1, 0, NOW())
       RETURNING id, user_id, started_at`,
      [req.user.userId]
    );

    const game = result.rows[0];

    res.json({ 
      gameId: game.id,
      userId: game.user_id,
      startedAt: game.started_at
    });

    console.log(`🎮 Game started: ID ${game.id} by user ${req.user.username}`);

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ 
      error: 'Failed to start game',
      message: 'Please try again'
    });
  }
});

/**
 * POST /api/game/answer
 * Submit an answer for current question (PROTECTED)
 * Body: { gameId, answer, questionNum }
 * 
 * NOTE: This is optional - used for tracking/analytics
 * You could expand this to store each answer in a separate table
 */
app.post('/api/game/answer', authenticateToken, async (req, res) => {
  try {
    const { gameId, answer, questionNum } = req.body;

    // Optional: Store answers in a separate table for analytics
    // For now, we just acknowledge receipt
    
    res.json({ 
      success: true,
      gameId,
      questionNum,
      answer
    });

  } catch (error) {
    console.error('Answer error:', error);
    res.status(500).json({ 
      error: 'Failed to submit answer' 
    });
  }
});

/**
 * POST /api/game/end
 * End a game and update scores (PROTECTED)
 * Body: { gameId, score }
 */
app.post('/api/game/end', authenticateToken, async (req, res) => {
  try {
    const { gameId, score } = req.body;

    // ============= VALIDATION =============
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ 
        error: 'Invalid score' 
      });
    }

    // ============= UPDATE GAME RECORD =============
    const gameResult = await pool.query(
      `UPDATE games 
       SET score = $1, completed_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [score, gameId, req.user.userId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Game not found or unauthorized' 
      });
    }

    // ============= GET USER'S CURRENT STATS =============
    const userResult = await pool.query(
      'SELECT best_score, games_played FROM users WHERE id = $1',
      [req.user.userId]
    );

    const currentBest = userResult.rows[0].best_score;
    const gamesPlayed = userResult.rows[0].games_played;

    // ============= UPDATE USER STATS =============
    const newBest = Math.max(currentBest, score);
    const isNewRecord = score > currentBest;
    
    const updateResult = await pool.query(
      `UPDATE users 
       SET best_score = $1, 
           games_played = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, email, best_score, games_played`,
      [newBest, gamesPlayed + 1, req.user.userId]
    );

    // ============= SEND RESPONSE =============
    res.json({ 
      message: 'Game completed',
      game: gameResult.rows[0],
      user: updateResult.rows[0],
      isNewRecord,
      improvement: score - currentBest
    });

    console.log(`🏁 Game ended: ${req.user.username} scored ${score}${isNewRecord ? ' (NEW RECORD!)' : ''}`);

  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ 
      error: 'Failed to end game',
      message: 'Your progress may not have been saved'
    });
  }
});

/**
 * GET /api/game/history
 * Get user's game history (PROTECTED)
 */
app.get('/api/game/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await pool.query(
      `SELECT id, score, started_at, completed_at
       FROM games
       WHERE user_id = $1
       ORDER BY completed_at DESC
       LIMIT $2`,
      [req.user.userId, limit]
    );

    res.json({
      games: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    console.error('Game history error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch game history' 
    });
  }
});

// ==============================================================================
// LEADERBOARD ROUTES
// ==============================================================================

/**
 * GET /api/leaderboard
 * Get top players by best score (PUBLIC)
 * Query params: ?limit=100
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await pool.query(
      `SELECT 
         id, 
         username, 
         best_score, 
         games_played,
         created_at
       FROM users 
       WHERE best_score > 0
       ORDER BY best_score DESC, games_played ASC, created_at ASC
       LIMIT $1`,
      [Math.min(limit, 1000)] // Cap at 1000 for performance
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      message: 'Please try again later'
    });
  }
});

/**
 * GET /api/leaderboard/rank/:userId
 * Get specific user's rank (PUBLIC)
 */
app.get('/api/leaderboard/rank/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await pool.query(
      `SELECT 
         COUNT(*) + 1 as rank
       FROM users 
       WHERE best_score > (SELECT best_score FROM users WHERE id = $1)
       OR (best_score = (SELECT best_score FROM users WHERE id = $1) 
           AND games_played < (SELECT games_played FROM users WHERE id = $1))`,
      [userId]
    );

    res.json({ 
      userId,
      rank: parseInt(result.rows[0].rank)
    });

  } catch (error) {
    console.error('Rank error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rank' 
    });
  }
});

// ==============================================================================
// STATISTICS ROUTES
// ==============================================================================

/**
 * GET /api/stats/global
 * Get global game statistics (PUBLIC)
 */
app.get('/api/stats/global', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(DISTINCT u.id) as total_players,
         SUM(u.games_played) as total_games,
         MAX(u.best_score) as highest_score,
         ROUND(AVG(u.best_score), 2) as avg_best_score,
         COUNT(CASE WHEN u.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_players_week
       FROM users u
       WHERE u.games_played > 0`
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Global stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics' 
    });
  }
});

// ==============================================================================
// HEALTH CHECK & ROOT
// ==============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    res.json({ 
      status: 'ok',
      message: 'Akinator Battle API is running',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

/**
 * GET /
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Akinator Battle API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (protected)',
        changePassword: 'POST /api/auth/change-password (protected)'
      },
      game: {
        start: 'POST /api/game/start (protected)',
        answer: 'POST /api/game/answer (protected)',
        end: 'POST /api/game/end (protected)',
        history: 'GET /api/game/history (protected)'
      },
      leaderboard: {
        list: 'GET /api/leaderboard',
        rank: 'GET /api/leaderboard/rank/:userId'
      },
      stats: {
        global: 'GET /api/stats/global'
      },
      utility: {
        health: 'GET /api/health'
      }
    }
  });
});

// ==============================================================================
// ERROR HANDLING
// ==============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
    availableRoutes: '/ or /api/health for info'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==============================================================================
// START SERVER
// ==============================================================================
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('🎮 AKINATOR BATTLE - Backend Server');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 API docs: http://localhost:${PORT}/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server gracefully...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});