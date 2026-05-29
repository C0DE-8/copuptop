const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const db = require('../config/db');
const flutterwave = require('../config/flutterwave');

const DEFAULT_WALLET_CURRENCY = process.env.DEFAULT_WALLET_CURRENCY || 'NGN';

const money = (value) => Number(Number(value).toFixed(4));
const makeReference = (prefix) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

const providerErrorMessage = (error) => (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'Payment provider request failed'
);

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

const verifyFlutterwaveSignature = (req) => {
    const secretHash = process.env.FLW_SECRET_HASH;

    if (!secretHash) {
        return false;
    }

    const legacyHash = req.headers['verif-hash'];
    const expectedLegacyHash = Buffer.from(secretHash);
    const receivedLegacyHash = Buffer.from(String(legacyHash || ''));

    if (
        legacyHash &&
        receivedLegacyHash.length === expectedLegacyHash.length &&
        crypto.timingSafeEqual(receivedLegacyHash, expectedLegacyHash)
    ) {
        return true;
    }

    const signature = req.headers['flutterwave-signature'];
    if (!signature || !req.rawBody) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', secretHash)
        .update(req.rawBody)
        .digest('hex');

    const receivedSignature = Buffer.from(String(signature));
    const expectedSignature = Buffer.from(expected);

    return receivedSignature.length === expectedSignature.length &&
        crypto.timingSafeEqual(receivedSignature, expectedSignature);
};

const flutterwaveStatus = (status) => String(status || '').toLowerCase();

const creditWalletFromPayment = async (payload) => {
    const data = payload.data || payload;
    const providerTransactionId = data.id ? String(data.id) : null;
    const providerReference = String(data.flw_ref || data.flwRef || data.reference || providerTransactionId || '').slice(0, 120);
    const accountReference = String(data.tx_ref || data.txRef || data.reference || '').slice(0, 80);
    const amount = money(data.amount || data.charged_amount);
    const currency = String(data.currency || DEFAULT_WALLET_CURRENCY).toUpperCase();

    if (!providerTransactionId && !providerReference) {
        return { processed: false, reason: 'missing provider transaction reference' };
    }

    let verified = data;

    if (providerTransactionId) {
        const response = await flutterwave.get(`/transactions/${providerTransactionId}/verify`);
        verified = response.data.data || response.data;
    }

    const verifiedStatus = flutterwaveStatus(verified.status || data.status);
    const verifiedAmount = money(verified.amount || verified.charged_amount || amount);
    const verifiedCurrency = String(verified.currency || currency).toUpperCase();

    if (verifiedStatus !== 'successful' || verifiedAmount <= 0) {
        return { processed: false, reason: 'payment is not successful' };
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.execute(
            `SELECT id
             FROM transactions
             WHERE provider = 'flutterwave'
               AND provider_reference = ?
             LIMIT 1`,
            [providerReference]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return { processed: true, duplicate: true };
        }

        const [accounts] = await connection.execute(
            `SELECT fa.user_id, fa.wallet_id, w.balance, w.status
             FROM flutterwave_accounts fa
             INNER JOIN wallets w ON w.id = fa.wallet_id
             WHERE (fa.reference = ? OR fa.account_number = ?)
               AND fa.currency = ?
             LIMIT 1
             FOR UPDATE`,
            [accountReference, String(data.account_number || ''), verifiedCurrency]
        );

        if (accounts.length === 0 || accounts[0].status !== 'active') {
            await connection.rollback();
            return { processed: false, reason: 'matching wallet account not found' };
        }

        const account = accounts[0];
        const reference = makeReference('CUP-FUND');
        const balanceAfter = money(account.balance + verifiedAmount);

        await connection.execute(
            `UPDATE wallets SET balance = ? WHERE id = ?`,
            [balanceAfter, account.wallet_id]
        );

        const [transaction] = await connection.execute(
            `INSERT INTO transactions
                (user_id, wallet_id, type, direction, amount, currency, reference, provider,
                 provider_reference, provider_transaction_id, status, description, metadata)
             VALUES (?, ?, 'wallet_funding', 'credit', ?, ?, ?, 'flutterwave', ?, ?, 'successful',
                     'Flutterwave wallet funding', ?)`,
            [
                account.user_id,
                account.wallet_id,
                verifiedAmount,
                verifiedCurrency,
                reference,
                providerReference,
                providerTransactionId,
                JSON.stringify({ webhookEvent: payload.event || null, raw: data })
            ]
        );

        await connection.execute(
            `INSERT INTO wallet_ledger
                (wallet_id, transaction_id, entry_group, reference, entry_type, amount, currency,
                 balance_after, description, metadata)
             VALUES (?, ?, ?, ?, 'credit', ?, ?, ?, 'Flutterwave wallet funding', ?)`,
            [
                account.wallet_id,
                transaction.insertId,
                reference,
                reference,
                verifiedAmount,
                verifiedCurrency,
                balanceAfter,
                JSON.stringify({ providerReference, providerTransactionId })
            ]
        );

        await connection.commit();
        return { processed: true, duplicate: false };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const reverseFailedBankTransfer = async (connection, transfer, reason) => {
    const reversalReference = `${transfer.reference}-REVERSAL`;
    const [existing] = await connection.execute(
        `SELECT id FROM transactions WHERE reference = ? LIMIT 1`,
        [reversalReference]
    );

    if (existing.length > 0) {
        return;
    }

    const [wallets] = await connection.execute(
        `SELECT id, balance
         FROM wallets
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [transfer.wallet_id]
    );

    if (wallets.length === 0) {
        throw new Error('Wallet not found for reversal');
    }

    const balanceAfter = money(wallets[0].balance + Number(transfer.amount));

    await connection.execute(
        `UPDATE wallets SET balance = ? WHERE id = ?`,
        [balanceAfter, transfer.wallet_id]
    );

    const [reversalTx] = await connection.execute(
        `INSERT INTO transactions
            (user_id, wallet_id, type, direction, amount, currency, reference, status, description, metadata)
         VALUES (?, ?, 'bank_transfer', 'credit', ?, ?, ?, 'successful', ?, JSON_OBJECT('reverses', ?))`,
        [transfer.user_id, transfer.wallet_id, transfer.amount, transfer.currency, reversalReference, reason, transfer.reference]
    );

    await connection.execute(
        `INSERT INTO wallet_ledger
            (wallet_id, transaction_id, entry_group, reference, entry_type, amount, currency,
             balance_after, description)
         VALUES (?, ?, ?, ?, 'credit', ?, ?, ?, ?)`,
        [transfer.wallet_id, reversalTx.insertId, transfer.reference, reversalReference, transfer.amount, transfer.currency, balanceAfter, reason]
    );

    await connection.execute(
        `UPDATE transactions SET status = 'reversed' WHERE id = ?`,
        [transfer.transaction_id]
    );
};

const markTransferFromWebhook = async (payload) => {
    const data = payload.data || payload;
    const reference = String(data.reference || data.tx_ref || '').slice(0, 80);
    const providerTransferId = data.id ? String(data.id) : null;
    const providerStatus = flutterwaveStatus(data.status);
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT *
             FROM bank_transfers
             WHERE reference = ? OR provider_transfer_id = ?
             LIMIT 1
             FOR UPDATE`,
            [reference, providerTransferId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return { processed: false, reason: 'transfer not found' };
        }

        const transfer = rows[0];

        if (['successful', 'success'].includes(providerStatus)) {
            await connection.execute(
                `UPDATE bank_transfers
                 SET status = 'successful', provider_response = ?
                 WHERE id = ?`,
                [JSON.stringify(payload), transfer.id]
            );
            await connection.execute(
                `UPDATE transactions SET status = 'successful' WHERE id = ?`,
                [transfer.transaction_id]
            );
        } else if (['failed', 'cancelled'].includes(providerStatus)) {
            await reverseFailedBankTransfer(connection, transfer, 'Flutterwave transfer failed');
            await connection.execute(
                `UPDATE bank_transfers
                 SET status = 'failed', last_error = ?, provider_response = ?
                 WHERE id = ?`,
                [data.complete_message || 'Flutterwave transfer failed', JSON.stringify(payload), transfer.id]
            );
        }

        await connection.commit();
        return { processed: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

router.get('/', async (req, res) => {
    res.json({
        status: true,
        message: 'Bank Route Working'
    });
});

router.get('/banks', requireAuth, async (req, res, next) => {
    try {
        const country = String(req.query.country || 'NG').trim().toUpperCase();
        const response = await flutterwave.get(`/banks/${country}`);
        const banks = (response.data.data || []).map((bank) => ({
            id: bank.id || null,
            name: bank.name,
            code: String(bank.code || ''),
            country
        })).filter((bank) => bank.name && bank.code);

        return res.json({
            status: true,
            data: { banks }
        });
    } catch (error) {
        return res.status(502).json({
            status: false,
            message: providerErrorMessage(error)
        });
    }
});

router.post('/resolve-account', requireAuth, async (req, res, next) => {
    try {
        const bankCode = String(req.body.bankCode || '').trim();
        const accountNumber = String(req.body.accountNumber || '').trim();

        if (!bankCode || !accountNumber) {
            return res.status(400).json({
                status: false,
                message: 'bankCode and accountNumber are required'
            });
        }

        const response = await flutterwave.post('/accounts/resolve', {
            account_bank: bankCode,
            account_number: accountNumber
        });

        const data = response.data.data || response.data;
        const accountName = data.account_name || data.accountName;

        if (!accountName) {
            return res.status(404).json({
                status: false,
                message: 'Account name could not be resolved'
            });
        }

        return res.json({
            status: true,
            data: {
                account: {
                    accountNumber: data.account_number || accountNumber,
                    accountName,
                    bankCode
                }
            }
        });
    } catch (error) {
        return res.status(502).json({
            status: false,
            message: providerErrorMessage(error)
        });
    }
});

router.get('/virtual-account', requireAuth, async (req, res, next) => {
    try {
        const currency = String(req.query.currency || DEFAULT_WALLET_CURRENCY).trim().toUpperCase();
        const [accounts] = await db.execute(
            `SELECT reference, account_number AS accountNumber, bank_name AS bankName,
                    account_name AS accountName, currency, status, created_at AS createdAt
             FROM flutterwave_accounts
             WHERE user_id = ? AND currency = ?
             LIMIT 1`,
            [req.user.id, currency]
        );

        return res.json({
            status: true,
            data: { account: accounts[0] || null }
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/virtual-account', requireAuth, async (req, res, next) => {
    try {
        const currency = String(req.body.currency || DEFAULT_WALLET_CURRENCY).trim().toUpperCase();
        const bvn = req.body.bvn ? String(req.body.bvn).trim() : null;
        const narration = String(req.body.narration || `${req.user.first_name} ${req.user.last_name}`).trim().slice(0, 180);

        const [wallets] = await db.execute(
            `SELECT id FROM wallets WHERE user_id = ? AND currency = ? AND status = 'active' LIMIT 1`,
            [req.user.id, currency]
        );

        if (wallets.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'Active wallet not found'
            });
        }

        const [existing] = await db.execute(
            `SELECT reference, account_number AS accountNumber, bank_name AS bankName,
                    account_name AS accountName, currency, status
             FROM flutterwave_accounts
             WHERE user_id = ? AND currency = ? AND status = 'active'
             LIMIT 1`,
            [req.user.id, currency]
        );

        if (existing.length > 0) {
            return res.json({
                status: true,
                message: 'Virtual account already exists',
                data: { account: existing[0] }
            });
        }

        const reference = makeReference('CUP-VA');
        const response = await flutterwave.post('/virtual-account-numbers', {
            email: req.user.email,
            is_permanent: true,
            bvn,
            tx_ref: reference,
            narration,
            phonenumber: req.user.phone,
            firstname: req.user.first_name,
            lastname: req.user.last_name
        });

        const data = response.data.data || response.data;
        const accountNumber = String(data.account_number || data.accountNumber || '');
        const bankName = String(data.bank_name || data.bankName || data.bank || '');
        const accountName = data.account_name || data.accountName || narration;

        if (!accountNumber || !bankName) {
            return res.status(502).json({
                status: false,
                message: 'Flutterwave did not return virtual account details'
            });
        }

        await db.execute(
            `INSERT INTO flutterwave_accounts
                (user_id, wallet_id, reference, account_number, bank_name, account_name,
                 flw_reference, currency, status, provider_response)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [
                req.user.id,
                wallets[0].id,
                reference,
                accountNumber,
                bankName,
                accountName,
                data.flw_ref || data.order_ref || null,
                currency,
                JSON.stringify(response.data)
            ]
        );

        return res.status(201).json({
            status: true,
            message: 'Virtual account created',
            data: {
                account: {
                    reference,
                    accountNumber,
                    bankName,
                    accountName,
                    currency,
                    status: 'active'
                }
            }
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/webhook/flutterwave', async (req, res, next) => {
    try {
        if (!verifyFlutterwaveSignature(req)) {
            return res.status(401).json({
                status: false,
                message: 'Invalid Flutterwave webhook signature'
            });
        }

        const event = String(req.body.event || '').toLowerCase();
        const data = req.body.data || {};

        if (event.includes('transfer') || data.transfer_type || data.account_bank) {
            await markTransferFromWebhook(req.body);
        } else {
            await creditWalletFromPayment(req.body);
        }

        return res.sendStatus(200);
    } catch (error) {
        return next(error);
    }
});

router.post('/transfer', requireAuth, async (req, res, next) => {
    const amount = money(req.body.amount);
    const currency = String(req.body.currency || DEFAULT_WALLET_CURRENCY).trim().toUpperCase();
    const bankCode = String(req.body.bankCode || '').trim();
    const accountNumber = String(req.body.accountNumber || '').trim();
    const accountName = req.body.accountName ? String(req.body.accountName).trim().slice(0, 180) : null;
    const narration = String(req.body.narration || 'Copup Bank transfer').trim().slice(0, 180);
    const reference = String(req.body.reference || makeReference('CUP-BANK')).trim().slice(0, 80);

    const missingFields = [];

    if (!Number.isFinite(amount) || amount <= 0) {
        missingFields.push('amount');
    }

    if (!bankCode) {
        missingFields.push('bankCode');
    }

    if (!accountNumber) {
        missingFields.push('accountNumber');
    }

    if (missingFields.length > 0) {
        return res.status(400).json({
            status: false,
            message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`,
            errors: missingFields
        });
    }

    const connection = await db.getConnection();
    let transferId;
    let transactionId;
    let balanceAfter;

    try {
        await connection.beginTransaction();

        const [existing] = await connection.execute(
            `SELECT reference, status
             FROM bank_transfers
             WHERE reference = ?
             LIMIT 1`,
            [reference]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                status: false,
                message: 'Transfer reference already exists'
            });
        }

        const [wallets] = await connection.execute(
            `SELECT id, balance, status
             FROM wallets
             WHERE user_id = ? AND currency = ?
             LIMIT 1
             FOR UPDATE`,
            [req.user.id, currency]
        );

        if (wallets.length === 0 || wallets[0].status !== 'active') {
            await connection.rollback();
            return res.status(404).json({
                status: false,
                message: 'Active wallet not found'
            });
        }

        if (wallets[0].balance < amount) {
            await connection.rollback();
            return res.status(400).json({
                status: false,
                message: 'Insufficient wallet balance'
            });
        }

        balanceAfter = money(wallets[0].balance - amount);

        await connection.execute(
            `UPDATE wallets SET balance = ? WHERE id = ?`,
            [balanceAfter, wallets[0].id]
        );

        const [transaction] = await connection.execute(
            `INSERT INTO transactions
                (user_id, wallet_id, type, direction, amount, currency, reference, provider,
                 status, description, metadata)
             VALUES (?, ?, 'bank_transfer', 'debit', ?, ?, ?, 'flutterwave', 'pending', ?, JSON_OBJECT('bankCode', ?, 'accountNumber', ?))`,
            [req.user.id, wallets[0].id, amount, currency, reference, narration, bankCode, accountNumber]
        );
        transactionId = transaction.insertId;

        await connection.execute(
            `INSERT INTO wallet_ledger
                (wallet_id, transaction_id, entry_group, reference, entry_type, amount, currency,
                 balance_after, description)
             VALUES (?, ?, ?, ?, 'debit', ?, ?, ?, ?)`,
            [wallets[0].id, transactionId, reference, reference, amount, currency, balanceAfter, narration]
        );

        const [transfer] = await connection.execute(
            `INSERT INTO bank_transfers
                (user_id, wallet_id, transaction_id, reference, amount, currency, bank_code,
                 account_number, account_name, narration, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [req.user.id, wallets[0].id, transactionId, reference, amount, currency, bankCode, accountNumber, accountName, narration]
        );
        transferId = transfer.insertId;

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        connection.release();
        return next(error);
    }

    connection.release();

    try {
        const response = await flutterwave.post('/transfers', {
            account_bank: bankCode,
            account_number: accountNumber,
            amount,
            narration,
            currency,
            reference,
            debit_currency: currency
        });

        const data = response.data.data || response.data;

        await db.execute(
            `UPDATE bank_transfers
             SET status = 'processing',
                 provider_transfer_id = ?,
                 provider_reference = ?,
                 provider_response = ?
             WHERE id = ?`,
            [data.id ? String(data.id) : null, data.reference || reference, JSON.stringify(response.data), transferId]
        );
        await db.execute(
            `UPDATE transactions
             SET status = 'pending',
                 provider_reference = ?,
                 provider_transaction_id = ?
             WHERE id = ?`,
            [data.reference || reference, data.id ? String(data.id) : null, transactionId]
        );

        return res.status(201).json({
            status: true,
            message: 'Transfer submitted',
            data: {
                reference,
                providerTransferId: data.id || null,
                amount,
                currency,
                balance: balanceAfter
            }
        });
    } catch (error) {
        const reversalConnection = await db.getConnection();

        try {
            await reversalConnection.beginTransaction();
            const [rows] = await reversalConnection.execute(
                `SELECT * FROM bank_transfers WHERE id = ? LIMIT 1 FOR UPDATE`,
                [transferId]
            );

            if (rows.length > 0) {
                await reverseFailedBankTransfer(reversalConnection, rows[0], 'Flutterwave transfer initiation failed');
                await reversalConnection.execute(
                    `UPDATE bank_transfers
                     SET status = 'failed', last_error = ?
                     WHERE id = ?`,
                    [error.response?.data ? JSON.stringify(error.response.data) : error.message, transferId]
                );
            }

            await reversalConnection.commit();
        } catch (reversalError) {
            await reversalConnection.rollback();
            return next(reversalError);
        } finally {
            reversalConnection.release();
        }

        return next(error);
    }
});

router.get('/transfers', requireAuth, async (req, res, next) => {
    try {
        const [transfers] = await db.execute(
            `SELECT reference, provider_transfer_id AS providerTransferId, amount, currency,
                    bank_code AS bankCode, account_number AS accountNumber,
                    account_name AS accountName, narration, status, retry_count AS retryCount,
                    last_error AS lastError, created_at AS createdAt, updated_at AS updatedAt
             FROM bank_transfers
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT 100`,
            [req.user.id]
        );

        return res.json({
            status: true,
            data: { transfers }
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/transfers/:reference/retry', requireAuth, async (req, res, next) => {
    const connection = await db.getConnection();
    let transfer;
    let retryReference;
    let balanceAfter;

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT *
             FROM bank_transfers
             WHERE reference = ? AND user_id = ?
             LIMIT 1
             FOR UPDATE`,
            [req.params.reference, req.user.id]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                status: false,
                message: 'Transfer not found'
            });
        }

        transfer = rows[0];

        if (transfer.status !== 'failed') {
            await connection.rollback();
            return res.status(400).json({
                status: false,
                message: 'Only failed transfers can be retried'
            });
        }

        const [wallets] = await connection.execute(
            `SELECT id, balance, status
             FROM wallets
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [transfer.wallet_id]
        );

        if (wallets.length === 0 || wallets[0].status !== 'active') {
            await connection.rollback();
            return res.status(404).json({
                status: false,
                message: 'Active wallet not found'
            });
        }

        if (wallets[0].balance < transfer.amount) {
            await connection.rollback();
            return res.status(400).json({
                status: false,
                message: 'Insufficient wallet balance'
            });
        }

        retryReference = `${transfer.reference}-R${Number(transfer.retry_count) + 1}`;
        balanceAfter = money(wallets[0].balance - Number(transfer.amount));

        await connection.execute(`UPDATE wallets SET balance = ? WHERE id = ?`, [balanceAfter, transfer.wallet_id]);

        const [transaction] = await connection.execute(
            `INSERT INTO transactions
                (user_id, wallet_id, type, direction, amount, currency, reference, provider,
                 status, description, metadata)
             VALUES (?, ?, 'bank_transfer', 'debit', ?, ?, ?, 'flutterwave', 'pending', ?, JSON_OBJECT('retryOf', ?))`,
            [transfer.user_id, transfer.wallet_id, transfer.amount, transfer.currency, retryReference, transfer.narration, transfer.reference]
        );

        await connection.execute(
            `INSERT INTO wallet_ledger
                (wallet_id, transaction_id, entry_group, reference, entry_type, amount, currency,
                 balance_after, description)
             VALUES (?, ?, ?, ?, 'debit', ?, ?, ?, ?)`,
            [transfer.wallet_id, transaction.insertId, transfer.reference, retryReference, transfer.amount, transfer.currency, balanceAfter, transfer.narration]
        );

        await connection.execute(
            `UPDATE bank_transfers
             SET status = 'pending',
                 transaction_id = ?,
                 provider_reference = ?,
                 retry_count = retry_count + 1,
                 last_error = NULL
             WHERE id = ?`,
            [transaction.insertId, retryReference, transfer.id]
        );

        transfer.transaction_id = transaction.insertId;
        transfer.provider_reference = retryReference;
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        connection.release();
        return next(error);
    }

    connection.release();

    try {
        const response = await flutterwave.post('/transfers', {
            account_bank: transfer.bank_code,
            account_number: transfer.account_number,
            amount: Number(transfer.amount),
            narration: transfer.narration,
            currency: transfer.currency,
            reference: retryReference,
            debit_currency: transfer.currency
        });
        const data = response.data.data || response.data;

        await db.execute(
            `UPDATE bank_transfers
             SET status = 'processing',
                 provider_transfer_id = ?,
                 provider_response = ?
             WHERE id = ?`,
            [data.id ? String(data.id) : null, JSON.stringify(response.data), transfer.id]
        );

        return res.json({
            status: true,
            message: 'Transfer retry submitted',
            data: {
                reference: transfer.reference,
                retryReference,
                providerTransferId: data.id || null,
                balance: balanceAfter
            }
        });
    } catch (error) {
        const reversalConnection = await db.getConnection();

        try {
            await reversalConnection.beginTransaction();
            const [rows] = await reversalConnection.execute(
                `SELECT * FROM bank_transfers WHERE id = ? LIMIT 1 FOR UPDATE`,
                [transfer.id]
            );

            if (rows.length > 0) {
                await reverseFailedBankTransfer(reversalConnection, rows[0], 'Flutterwave transfer retry failed');
                await reversalConnection.execute(
                    `UPDATE bank_transfers
                     SET status = 'failed', last_error = ?
                     WHERE id = ?`,
                    [error.response?.data ? JSON.stringify(error.response.data) : error.message, transfer.id]
                );
            }

            await reversalConnection.commit();
        } catch (reversalError) {
            await reversalConnection.rollback();
            return next(reversalError);
        } finally {
            reversalConnection.release();
        }

        return next(error);
    }
});

module.exports = router;
