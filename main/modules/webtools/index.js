const router = require('express').Router();
const axios = require('axios');

router.get('/', async (req, res) => {
    res.render('webtools/views/index', {
        title: 'webtools'
    });
});

router.post('/invokeRequest', async (req, res) => {
    const { type, url, query } = req.body;
    try {
        const response = await axios.post('http://localhost:3002/request', { data: { type, url, query } });
        res.status(200).json(response.data);
    } catch (error) {
        console.error(error);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

module.exports = router;
