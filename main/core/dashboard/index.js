const router = require('express').Router();

router.get('/', async (req, res) => {

    res.render('dashboard/views/index', {
        title: 'dashboard'
    });
});

module.exports = router;
