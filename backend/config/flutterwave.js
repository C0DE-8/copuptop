const axios = require('axios');

const flutterwave = axios.create({
    baseURL: process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3',
    timeout: Number(process.env.FLW_TIMEOUT_MS || 30000),
    headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY || ''}`,
        'Content-Type': 'application/json'
    }
});

module.exports = flutterwave;
