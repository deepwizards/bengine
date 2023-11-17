const router = require('express').Router();

router.get('/', async (req, res) => {
    res.render('install/views/index', {
        title: 'install'
    });
});

module.exports = router;
