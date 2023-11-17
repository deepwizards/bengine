const router = require('express').Router();

router.get('/', async (req, res) => {
    res.render('queue/views/index', {
        title: 'queue'
    });
});

module.exports = router;
