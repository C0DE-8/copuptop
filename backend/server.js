require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();


// MIDDLEWARE
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());


// ROUTES
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/wallet', require('./routes/wallet.route'));
app.use('/api/bank', require('./routes/bank.route'));


// HOME
app.get('/', (req, res) => {

    res.json({
        status: true,
        message: 'Copup Bank API Running 🚀'
    });

});


const PORT = process.env.PORT || 1159;


app.listen(PORT, () => {

    console.log(`🚀 Server running on port http://localhost:${PORT}`);

});