const router = require('express').Router();
const axios = require('axios').default;

router.get('/', async (req, res) => {
    res.render('openai/views/index', {
        title: 'openai'
    });
});

router.post('/gpt', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3001/gpt', {
            data: {
                model: req.body.model,
                prompt: req.body.prompt,
                max_tokens: req.body.maxTokens,
                temperature: req.body.temperature,
                top_p: req.body.topP,
                frequency_penalty: req.body.frequencyPenalty,
                presence_penalty: req.body.presencePenalty,
                n: req.body.n,
                stream: req.body.stream,
                logprobs: req.body.logprobs,
                echo: req.body.echo,
                stop: req.body.stop
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing GPT request');
    }
});

router.post('/gpt/cost-estimate', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3001/cost-estimate', {
            data: {
                model: req.body.model,
                promptLength: req.body.promptLength,
                responseLength: req.body.responseLength
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error estimating cost');
    }
});

module.exports = router;
