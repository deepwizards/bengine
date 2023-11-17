const express = require('express');
const app = express();
const port = 3001;
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const { gpt } = require('./gpt.js')

const service = {
    async functionToCall(data) {
        return new Promise(async (resolve, reject) => {
            const maxRetries = 5;
            for(let i = 0; i < maxRetries; i++){
                try{
                    let result = await gpt(data);
                    return resolve(result);
                } catch (error) {
                    console.error(`Attempt ${i+1} failed with error: ${error.message}`);
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

app.get('/status', (req, res) => {
	res.status(200).send({
        status: 'OK',
        message: 'GPT API is running'
	})
});

app.listen(port, () => {
    console.log(`GPT Service API listening at http://localhost:${port}`);
});
