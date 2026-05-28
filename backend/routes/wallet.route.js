const router = require('express').Router();


// TEST ROUTE
router.get('/', async (req, res) => {

    res.json({
        status: true,
        message: 'Wallet Route Working'
    });

});


module.exports = router;