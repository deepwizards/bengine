const router = require('express').Router();
const Data = require('../../db/models/Data.js');

router.get('/', async (req, res) => {
    let items = await Data.find({});
    res.render('data/views/index', {
        title: 'data',
        items: items,
    });
});

router.get('/manager', async (req, res) => {
    res.render('data/views/manager', {
        title: 'data'
    });
});

router.get('/new', async (req, res) => {
    res.render('data/views/new', {
        title: 'Create Data',
    });
});

router.post('/create', async (req, res) => {
    const newItem = new Data(req.body);
    await newItem.save();
    res.redirect('/data');
});

router.get('/:id', async (req, res) => {
    let item = await Data.findById(req.params.id);
    res.render('data/views/single', {
        title: 'Data',
        item,
    });
});

router.get('/edit/:id', async (req, res) => {
    let item = await Data.findById(req.params.id);
    res.render('data/views/edit', {
        title: 'Edit Data',
        item,
    });
});

router.post('/update/:id', async (req, res) => {
    await Data.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/data');
});

router.post('/delete/:id', async (req, res) => {
    await Data.findByIdAndDelete(req.params.id);
    res.redirect('/data');
});

module.exports = router;
