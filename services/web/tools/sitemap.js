const Sitemapper = require('sitemapper');
const puppeteer = require('puppeteer');
const asyncLib = require('async');
const sitemapper = new Sitemapper({ timeout: 30000 });

exports.sitemap = async (websiteUrl) => {
    const sites = await sitemapper.fetch(websiteUrl + '/sitemap.xml').catch(() => null);
    if (sites && sites.sites.length > 0) {
        return sites;
    }
    const crawledUrls = await crawlWebsite(websiteUrl);
    return crawledUrls;
};

async function crawlWebsite(websiteUrl) {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.3';
    const disallowedUrls = new Set();
    const visited = new Set();
    const toVisit = new Set([websiteUrl]);
    const fetchPage = async (url, browser) => {
        try {
            const page = await browser.newPage();
            await page.setUserAgent(userAgent);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const links = await page.$$eval('a[href]', (anchors) => {
                return anchors.map((anchor) => anchor.href);
            });
            for (const link of links) {
                const absoluteUrl = new URL(link, url).href;
                if (
                    absoluteUrl.startsWith(websiteUrl) &&
                    !visited.has(absoluteUrl) &&
                    !toVisit.has(absoluteUrl) &&
                    !disallowedUrls.has(absoluteUrl)
                ) {
                    toVisit.add(absoluteUrl);
                }
            }
            visited.add(url);
            await page.close();
        } catch (error) {
            console.error('Error fetching page:', error.message);
        }
    };
    const crawl = async () => {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        while (toVisit.size > 0) {
            const currentUrls = Array.from(toVisit);
            toVisit.clear();
            await asyncLib.eachLimit(currentUrls, 5, async (url) => {
                await fetchPage(url, browser);
            });
        }
        await browser.close();
    };
    await crawl();
    return Array.from(visited);
}
