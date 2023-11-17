const router = require('express').Router();

router.get('/', async (req, res) => {
    res.render('settings/views/index', {
        title: 'settings'
    });
});

module.exports = router;
