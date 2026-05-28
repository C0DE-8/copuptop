const router = require('express').Router();


// TEST
router.get('/', async (req, res) => {

    res.json({
        status: true,
        message: 'Auth Route Working'
    });

});


module.exports = router;