const router = require('express').Router();

router.get('/', async (req, res) => {

    res.json({
        status: true,
        message: 'Bank Route Working'
    });

});

module.exports = router;