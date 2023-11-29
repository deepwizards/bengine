const express = require('express');
const bodyParser = require("body-parser");
const { URL } = require('url');
const app = express();
const port = process.env.SERVICE_PORT || 3002;
app.use(bodyParser.json());

const {search} = require('./tools/search');
const {scraper} = require('./tools/scraper');
const {scrapeHTMLWithRetries} = require('./tools/scraperv2');
const {sitemap} = require('./tools/sitemap');

const validUrl = (url) => {
    // Trim input and ensure case-insensitive protocol checking
    url = url.trim().toLowerCase();
    // Add 'https://' if the protocol is missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + (url.startsWith('www.') ? '' : 'www.') + url;
    }
    // Check if the URL is valid
    const urlRegExp = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/i;
    return urlRegExp.test(url);
};

const service = {
    async searchService(query) {
        return new Promise(async (resolve, reject) => {
            if (!query || typeof query !== 'string') {
                reject(new Error('Invalid query'));
            } else {
                const result = await search(query);
                resolve(result);
            }
        });
    },
    async scraperService(url) {
        return new Promise(async (resolve, reject) => {
            url = validUrl(url)
            const result = await scraper(url);
            resolve(result);
        });
    },
    async scraperV2Service(url) {
        return new Promise(async (resolve, reject) => {
            url = validUrl(url)
            const result = await scrapeHTMLWithRetries(url);
            resolve(result);
        });
    },
    async sitemapService(url) {
        return new Promise(async (resolve, reject) => {
            url = validUrl(url)
            const result = await sitemap(url);
            resolve(result);
        });
    },
};

app.get('/status', (req, res) => {
	res.status(200).send({
        status: 'OK',
        message: 'WEB API is running'
	})
});

app.post('/request', async (req, res) => {
    try {
        let result;
        const { type, url, query } = req.body;
        switch (type) {
            case 'search':
                result = await service.searchService(query);
                break;
            case 'scraper':
                result = await service.scraperService(url);
                break;
            case 'scraperV2':
                result = await service.scraperV2Service(url);
                break;
            case 'sitemap':
                result = await service.sitemapService(url);
                break;
            default:
                throw new Error('Invalid request type');
        }
        res.status(200).json({ result });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Web Services API listening at http://localhost:${port}`);
});
