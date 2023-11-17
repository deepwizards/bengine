const router = require('express').Router();

router.get('/', async (req, res) => {
    res.render('queue/views/activity', {
        title: 'queue'
    });
});

module.exports = router;
