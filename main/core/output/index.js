const router = require('express').Router();
const Output = require('../../db/models/Output.js');
const Job = require('../../db/models/Job.js');

router.get('/', async (req, res) => {
    let items = await Output.find({});
    res.render('output/views/index', {
        title: 'output',
        items: items,
    });
});

router.get('/:id', async (req, res) => {
    let item = await Output.findById(req.params.id);
    let job = await Job.findById(item.job_id);
    res.render('output/views/single', {
        title: 'Outputs',
        item,
        job
    });
});

router.post('/delete/:id', async (req, res) => {
    await Output.findByIdAndDelete(req.params.id);
    res.redirect('/output');
});

module.exports = router;
