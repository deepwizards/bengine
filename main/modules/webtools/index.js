const router = require('express').Router();

router.get('/', async (req, res) => {
    res.render('webtools/views/index', {
        title: 'webtools'
    });
});

module.exports = router;
