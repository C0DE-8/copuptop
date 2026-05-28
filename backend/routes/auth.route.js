const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const db = require('../config/db');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const DEFAULT_WALLET_CURRENCY = process.env.DEFAULT_WALLET_CURRENCY || 'NGN';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const ensureJwtConfigured = () => {
    if (!process.env.JWT_SECRET) {
        const error = new Error('JWT_SECRET is not configured');
        error.status = 500;
        throw error;
    }
};

const refreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const refreshExpiryDate = () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    return expiresAt;
};

const signAccessToken = (user) => {
    ensureJwtConfigured();

    return jwt.sign(
        {
            sub: String(user.id),
            publicId: user.public_id,
            email: user.email,
            type: 'access'
        },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const signRefreshToken = (user, sessionPublicId) => {
    ensureJwtConfigured();

    return jwt.sign(
        {
            sub: String(user.id),
            publicId: user.public_id,
            sessionId: sessionPublicId,
            type: 'refresh'
        },
        refreshSecret(),
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
};

const sanitizeUser = (user) => ({
    id: user.public_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    createdAt: user.created_at
});

const sessionMeta = (req) => ({
    deviceName: req.body.deviceName ? String(req.body.deviceName).trim().slice(0, 120) : null,
    ipAddress: req.ip,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 255)
});

const createSession = async (connection, req, user) => {
    const publicId = randomUUID();
    const refreshToken = signRefreshToken(user, publicId);
    const meta = sessionMeta(req);

    await connection.execute(
        `INSERT INTO user_sessions
            (public_id, user_id, refresh_token_hash, device_name, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [publicId, user.id, hashToken(refreshToken), meta.deviceName, meta.ipAddress, meta.userAgent, refreshExpiryDate()]
    );

    return refreshToken;
};

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({
                status: false,
                message: 'Authorization bearer token is required'
            });
        }

        ensureJwtConfigured();
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (payload.type !== 'access') {
            return res.status(401).json({
                status: false,
                message: 'Invalid token type'
            });
        }

        const [users] = await db.execute(
            `SELECT id, public_id, first_name, last_name, email, phone, status, created_at
             FROM users
             WHERE id = ? AND status = 'active'
             LIMIT 1`,
            [payload.sub]
        );

        if (users.length === 0) {
            return res.status(401).json({
                status: false,
                message: 'Invalid or expired session'
            });
        }

        req.user = users[0];
        return next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: false,
                message: 'Invalid or expired token'
            });
        }

        return next(error);
    }
};

router.get('/', async (req, res) => {
    res.json({
        status: true,
        message: 'Auth Route Working'
    });
});

router.post('/register', async (req, res, next) => {
    let firstName;
    let lastName;
    let email;
    let phone;
    let password;

    try {
        ensureJwtConfigured();

        firstName = String(req.body.firstName || '').trim();
        lastName = String(req.body.lastName || '').trim();
        email = normalizeEmail(req.body.email);
        phone = req.body.phone ? String(req.body.phone).trim() : null;
        password = String(req.body.password || '');
    } catch (error) {
        return next(error);
    }

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
            status: false,
            message: 'firstName, lastName, email, and password are required'
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            status: false,
            message: 'A valid email address is required'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            status: false,
            message: 'Password must be at least 8 characters'
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const passwordHash = await bcrypt.hash(password, 12);
        const publicId = randomUUID();

        const [userResult] = await connection.execute(
            `INSERT INTO users (public_id, first_name, last_name, email, phone, password_hash)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [publicId, firstName, lastName, email, phone, passwordHash]
        );

        await connection.execute(
            `INSERT INTO wallets (user_id, currency, balance, status)
             VALUES (?, ?, 0.0000, 'active')`,
            [userResult.insertId, DEFAULT_WALLET_CURRENCY]
        );

        const [users] = await connection.execute(
            `SELECT id, public_id, first_name, last_name, email, phone, status, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userResult.insertId]
        );

        const user = users[0];
        const refreshToken = await createSession(connection, req, user);

        await connection.commit();

        return res.status(201).json({
            status: true,
            message: 'Registration successful',
            data: {
                user: sanitizeUser(user),
                accessToken: signAccessToken(user),
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: JWT_EXPIRES_IN
            }
        });
    } catch (error) {
        await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                status: false,
                message: 'Email or phone number already exists'
            });
        }

        return next(error);
    } finally {
        connection.release();
    }
});

router.post('/login', async (req, res, next) => {
    const connection = await db.getConnection();

    try {
        ensureJwtConfigured();

        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({
                status: false,
                message: 'email and password are required'
            });
        }

        const [users] = await connection.execute(
            `SELECT id, public_id, first_name, last_name, email, phone, password_hash, status, created_at
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                status: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        if (user.status !== 'active') {
            return res.status(403).json({
                status: false,
                message: 'Account is not active'
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({
                status: false,
                message: 'Invalid email or password'
            });
        }

        await connection.beginTransaction();
        const refreshToken = await createSession(connection, req, user);
        await connection.commit();

        return res.json({
            status: true,
            message: 'Login successful',
            data: {
                user: sanitizeUser(user),
                accessToken: signAccessToken(user),
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: JWT_EXPIRES_IN
            }
        });
    } catch (error) {
        await connection.rollback();
        return next(error);
    } finally {
        connection.release();
    }
});

router.post('/refresh', async (req, res, next) => {
    try {
        ensureJwtConfigured();

        const refreshToken = String(req.body.refreshToken || '');

        if (!refreshToken) {
            return res.status(400).json({
                status: false,
                message: 'refreshToken is required'
            });
        }

        const payload = jwt.verify(refreshToken, refreshSecret());

        if (payload.type !== 'refresh') {
            return res.status(401).json({
                status: false,
                message: 'Invalid token type'
            });
        }

        const [sessions] = await db.execute(
            `SELECT s.id, s.public_id, s.user_id, u.public_id AS user_public_id,
                    u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at
             FROM user_sessions s
             INNER JOIN users u ON u.id = s.user_id
             WHERE s.public_id = ?
               AND s.refresh_token_hash = ?
               AND s.revoked_at IS NULL
               AND s.expires_at > NOW()
               AND u.status = 'active'
             LIMIT 1`,
            [payload.sessionId, hashToken(refreshToken)]
        );

        if (sessions.length === 0) {
            return res.status(401).json({
                status: false,
                message: 'Invalid or expired refresh token'
            });
        }

        const session = sessions[0];
        const user = {
            id: session.user_id,
            public_id: session.user_public_id,
            first_name: session.first_name,
            last_name: session.last_name,
            email: session.email,
            phone: session.phone,
            status: session.status,
            created_at: session.created_at
        };
        const nextRefreshToken = signRefreshToken(user, session.public_id);

        await db.execute(
            `UPDATE user_sessions
             SET refresh_token_hash = ?, expires_at = ?
             WHERE id = ?`,
            [hashToken(nextRefreshToken), refreshExpiryDate(), session.id]
        );

        return res.json({
            status: true,
            message: 'Token refreshed',
            data: {
                accessToken: signAccessToken(user),
                refreshToken: nextRefreshToken,
                tokenType: 'Bearer',
                expiresIn: JWT_EXPIRES_IN
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: false,
                message: 'Invalid or expired refresh token'
            });
        }

        return next(error);
    }
});

router.post('/logout', async (req, res, next) => {
    try {
        const refreshToken = String(req.body.refreshToken || '');

        if (!refreshToken) {
            return res.status(400).json({
                status: false,
                message: 'refreshToken is required'
            });
        }

        await db.execute(
            `UPDATE user_sessions
             SET revoked_at = NOW()
             WHERE refresh_token_hash = ? AND revoked_at IS NULL`,
            [hashToken(refreshToken)]
        );

        return res.json({
            status: true,
            message: 'Logged out'
        });
    } catch (error) {
        return next(error);
    }
});

router.get('/me', requireAuth, async (req, res) => {
    return res.json({
        status: true,
        data: {
            user: sanitizeUser(req.user)
        }
    });
});

router.get('/sessions', requireAuth, async (req, res, next) => {
    try {
        const [sessions] = await db.execute(
            `SELECT public_id AS id, device_name AS deviceName, ip_address AS ipAddress,
                    user_agent AS userAgent, expires_at AS expiresAt,
                    revoked_at AS revokedAt, created_at AS createdAt
             FROM user_sessions
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        return res.json({
            status: true,
            data: { sessions }
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
