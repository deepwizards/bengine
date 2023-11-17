const router = require('express').Router();

router.get('/', async (req, res) => {
    res.render('module/views/index', {
        title: 'module'
    });
});

module.exports = router;
