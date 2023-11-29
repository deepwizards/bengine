import express from 'express';
import bodyParser from 'body-parser';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.SERVICE_PORT || 3001;

app.use(bodyParser.json());

const tokenCosts = {
    "gpt-4-1106-preview": { input: 0.01, output: 0.03 },
    "gpt-4-1106-vision-preview": { input: 0.01, output: 0.03 },
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-32k": { input: 0.06, output: 0.12 },
    "gpt-3.5-turbo-1106": { input: 0.0010, output: 0.0020 },
    "gpt-3.5-turbo-instruct": { input: 0.0015, output: 0.0020 }
};

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function gpt(data) {
    const { model, prompt, max_tokens, temperature, top_p, frequency_penalty, presence_penalty, n, stream, logprobs, echo, stop } = data;
    if (!prompt) {
        throw new Error("Prompt argument required");
    }

    const openAIGPTResponse = await openai.createChatCompletion({
        model: model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        n,
        stream,
        logprobs,
        echo,
        stop
    });

    return openAIGPTResponse.data.choices[0].message.content;
}

function estimateCost(data) {
    const { model, promptLength, responseLength } = data;
    const costPerToken = tokenCosts[model] || tokenCosts["gpt-3.5-turbo-1106"];
    const totalCost = (promptLength * costPerToken.input + responseLength * costPerToken.output) / 1000;
    return totalCost.toFixed(4);
}

const service = {
    async functionToCall(data) {
        return new Promise(async (resolve, reject) => {
            const maxRetries = 5;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    let result = await gpt(data);
                    return resolve(result);
                } catch (error) {
                    console.error(`Attempt ${i + 1} failed with error: ${error.message}`);
                    if (error.message !== '429') { // If it's not a rate limit error, exit immediately
                        break;
                    }
                    await new Promise(r => setTimeout(r, 1000)); // Wait for 1 second before retrying
                }
            }
            reject('Failed to get a result after several attempts.');
        });
    },
};

app.post('/gpt', async (req, res) => {
    try {
        const result = await service.functionToCall(req.body.data);
        res.status(200).json({ status: 'completed', result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', error: `Internal Server Error: ${error}` });
    }
});

app.post('/cost-estimate', (req, res) => {
    try {
        const cost = estimateCost(req.body.data);
        res.status(200).json({ status: 'completed', cost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', error: `Internal Server Error: ${error}` });
    }
});

app.get('/status', (req, res) => {
    res.status(200).send({
        status: 'OK',
        message: 'GPT API is running'
    });
});

app.listen(port, () => {
    console.log(`GPT Service API listening at http://localhost:${port}`);
});
