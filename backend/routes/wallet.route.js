const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const db = require('../config/db');

const DEFAULT_WALLET_CURRENCY = process.env.DEFAULT_WALLET_CURRENCY || 'NGN';

const money = (value) => Number(Number(value).toFixed(4));

const makeReference = (prefix) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

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

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

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

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const currency = String(req.query.currency || DEFAULT_WALLET_CURRENCY).trim().toUpperCase();
        const [wallets] = await db.execute(
            `SELECT id, currency, balance, status, created_at AS createdAt, updated_at AS updatedAt
             FROM wallets
             WHERE user_id = ? AND currency = ?
             LIMIT 1`,
            [req.user.id, currency]
        );

        if (wallets.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'Wallet not found'
            });
        }

        const wallet = wallets[0];
        const [ledgerTotals] = await db.execute(
            `SELECT
                COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) AS ledgerBalance
             FROM wallet_ledger
             WHERE wallet_id = ?`,
            [wallet.id]
        );

        return res.json({
            status: true,
            data: {
                wallet: {
                    id: wallet.id,
                    currency: wallet.currency,
                    balance: wallet.balance,
                    ledgerBalance: money(ledgerTotals[0].ledgerBalance),
                    status: wallet.status,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt
                }
            }
        });
    } catch (error) {
        return next(error);
    }
});

router.get('/ledger', requireAuth, async (req, res, next) => {
    try {
        const currency = String(req.query.currency || DEFAULT_WALLET_CURRENCY).trim().toUpperCase();
        const limit = Math.min(Number(req.query.limit || 50), 100);
        const [rows] = await db.execute(
            `SELECT l.reference, l.entry_group AS entryGroup, l.entry_type AS entryType,
                    l.amount, l.currency, l.balance_after AS balanceAfter,
                    l.description, l.created_at AS createdAt
             FROM wallet_ledger l
             INNER JOIN wallets w ON w.id = l.wallet_id
             WHERE w.user_id = ? AND w.currency = ?
             ORDER BY l.id DESC
             LIMIT ?`,
            [req.user.id, currency, limit]
        );

        return res.json({
            status: true,
            data: { ledger: rows }
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/transfer', requireAuth, async (req, res, next) => {
    const amount = money(req.body.amount);
    const currency = String(req.body.currency || DEFAULT_WALLET_CURRENCY).trim().toUpperCase();
    const recipientEmail = String(req.body.recipientEmail || '').trim().toLowerCase();
    const recipientUserId = String(req.body.recipientUserId || '').trim();
    const description = String(req.body.description || 'Wallet transfer').trim().slice(0, 255);
    const reference = String(req.body.reference || makeReference('CUP-W2W')).trim().slice(0, 80);

    if (!amount || amount <= 0) {
        return res.status(400).json({
            status: false,
            message: 'A positive amount is required'
        });
    }

    if (!recipientEmail && !recipientUserId) {
        return res.status(400).json({
            status: false,
            message: 'recipientEmail or recipientUserId is required'
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.execute(
            `SELECT id, status
             FROM transactions
             WHERE reference IN (?, ?)
             LIMIT 1`,
            [`${reference}-DEBIT`, `${reference}-CREDIT`]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                status: false,
                message: 'Transfer reference already exists'
            });
        }

        const [sourceWallets] = await connection.execute(
            `SELECT id, user_id, currency, balance, status
             FROM wallets
             WHERE user_id = ? AND currency = ?
             LIMIT 1
             FOR UPDATE`,
            [req.user.id, currency]
        );

        if (sourceWallets.length === 0 || sourceWallets[0].status !== 'active') {
            await connection.rollback();
            return res.status(404).json({
                status: false,
                message: 'Active source wallet not found'
            });
        }

        const sourceWallet = sourceWallets[0];

        if (sourceWallet.balance < amount) {
            await connection.rollback();
            return res.status(400).json({
                status: false,
                message: 'Insufficient wallet balance'
            });
        }

        const recipientWhere = recipientEmail ? 'u.email = ?' : 'u.public_id = ?';
        const recipientValue = recipientEmail || recipientUserId;
        const [recipientWallets] = await connection.execute(
            `SELECT w.id, w.user_id, w.currency, w.balance, w.status
             FROM users u
             INNER JOIN wallets w ON w.user_id = u.id AND w.currency = ?
             WHERE ${recipientWhere} AND u.status = 'active'
             LIMIT 1
             FOR UPDATE`,
            [currency, recipientValue]
        );

        if (recipientWallets.length === 0 || recipientWallets[0].status !== 'active') {
            await connection.rollback();
            return res.status(404).json({
                status: false,
                message: 'Active recipient wallet not found'
            });
        }

        const recipientWallet = recipientWallets[0];

        if (recipientWallet.user_id === req.user.id) {
            await connection.rollback();
            return res.status(400).json({
                status: false,
                message: 'Cannot transfer to the same wallet'
            });
        }

        const sourceBalanceAfter = money(sourceWallet.balance - amount);
        const recipientBalanceAfter = money(recipientWallet.balance + amount);

        await connection.execute(
            `UPDATE wallets SET balance = ? WHERE id = ?`,
            [sourceBalanceAfter, sourceWallet.id]
        );
        await connection.execute(
            `UPDATE wallets SET balance = ? WHERE id = ?`,
            [recipientBalanceAfter, recipientWallet.id]
        );

        const [debitTx] = await connection.execute(
            `INSERT INTO transactions
                (user_id, wallet_id, type, direction, amount, currency, reference, status, description, metadata)
             VALUES (?, ?, 'wallet_transfer', 'debit', ?, ?, ?, 'successful', ?, JSON_OBJECT('entryGroup', ?))`,
            [req.user.id, sourceWallet.id, amount, currency, `${reference}-DEBIT`, description, reference]
        );

        const [creditTx] = await connection.execute(
            `INSERT INTO transactions
                (user_id, wallet_id, type, direction, amount, currency, reference, status, description, metadata)
             VALUES (?, ?, 'wallet_transfer', 'credit', ?, ?, ?, 'successful', ?, JSON_OBJECT('entryGroup', ?))`,
            [recipientWallet.user_id, recipientWallet.id, amount, currency, `${reference}-CREDIT`, description, reference]
        );

        await connection.execute(
            `INSERT INTO wallet_ledger
                (wallet_id, transaction_id, entry_group, reference, entry_type, amount, currency,
                 balance_after, counterparty_wallet_id, description)
             VALUES (?, ?, ?, ?, 'debit', ?, ?, ?, ?, ?)`,
            [sourceWallet.id, debitTx.insertId, reference, `${reference}-DEBIT`, amount, currency, sourceBalanceAfter, recipientWallet.id, description]
        );

        await connection.execute(
            `INSERT INTO wallet_ledger
                (wallet_id, transaction_id, entry_group, reference, entry_type, amount, currency,
                 balance_after, counterparty_wallet_id, description)
             VALUES (?, ?, ?, ?, 'credit', ?, ?, ?, ?, ?)`,
            [recipientWallet.id, creditTx.insertId, reference, `${reference}-CREDIT`, amount, currency, recipientBalanceAfter, sourceWallet.id, description]
        );

        await connection.commit();

        return res.status(201).json({
            status: true,
            message: 'Transfer successful',
            data: {
                reference,
                amount,
                currency,
                balance: sourceBalanceAfter
            }
        });
    } catch (error) {
        await connection.rollback();
        return next(error);
    } finally {
        connection.release();
    }
});

module.exports = router;
