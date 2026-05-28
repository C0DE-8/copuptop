require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

const rateLimitStore = new Map();

const rateLimit = ({ windowMs, max }) => (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = rateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return next();
    }

    current.count += 1;

    if (current.count > max) {
        return res.status(429).json({
            status: false,
            message: 'Too many requests. Please try again later.'
        });
    }

    return next();
};


// MIDDLEWARE
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/refresh'], rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20
}));


// ROUTES
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/wallet', require('./routes/wallet.route'));
app.use('/api/bank', require('./routes/bank.route'));


// HOME
app.get('/', (req, res) => {

    res.json({
        status: true,
        message: 'Copup Bank API Running'
    });

});

app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error({
        message: err.message,
        status: err.status || err.response?.status || 500,
        provider: err.response?.data || null,
        path: req.path
    });

    res.status(err.status || err.response?.status || 500).json({
        status: false,
        message: err.response?.data?.message ||
            (process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message)
    });
});


const PORT = process.env.PORT || 1159;


const server = app.listen(PORT, () => {

    console.log(`Server running on port http://localhost:${PORT}`);

});

server.ref();
