import express from 'express';
import axios from 'axios';

const app = express();
const port = 3008;

app.use(express.json());

async function llStudio(data) {
    const {
        prompt,
        max_tokens,
        temperature,
        stream
    } = data;

    if (!prompt) {
        throw new Error("Prompt argument required");
    }

    const requestBody = {
        messages: [{ role: "user", content: prompt }],
        max_tokens: max_tokens || 1024,
        temperature: temperature || 0.7,
        stream: stream || false
    };
    const response = await axios.post('http://localhost:7331/v1/chat/completions', requestBody);
    return response.data.choices[0].message.content;
}

app.post('/llm', async (req, res) => {
    try {
        const result = await llStudio(req.body.data);
        res.status(200).json({ status: 'completed', result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', error: `Internal Server Error: ${error}` });
    }
});

app.get('/status', (req, res) => {
    res.status(200).send({
        status: 'OK',
        message: 'LM Studio API is running'
    });
});

app.listen(port, () => {
    console.log(`LM Studio Service API listening at http://localhost:${port}`);
});
