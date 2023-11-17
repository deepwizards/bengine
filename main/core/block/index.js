const router = require('express').Router();
const Block = require('../../db/models/Block');

router.get('/', async (req, res) => {
    res.render('block/views/index', {
        title: 'block',
        blocks: await Block.find()
    });
});

router.get('/:id', async (req, res) => {
    try {
        const block = await Block.findById(req.params.id);
        if (!block) {
            return res.status(404).json({ message: 'Block not found' });
        }
        res.json(block);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedBlock = await Block.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedBlock) {
            return res.status(404).json({ message: 'Block not found' });
        }
        res.json(updatedBlock);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

router.post('/:id/tags', async (req, res) => {
    try {
        const updatedBlock = await Block.findByIdAndUpdate(req.params.id, { tags: req.body.tags }, { new: true });
        if (!updatedBlock) {
            return res.status(404).json({ message: 'Block not found' });
        }
        res.json(updatedBlock);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedBlock = await Block.findByIdAndRemove(req.params.id);
        if (!deletedBlock) {
            return res.status(404).json({ message: 'Block not found' });
        }
        res.json({ message: 'Block deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

module.exports = router;
