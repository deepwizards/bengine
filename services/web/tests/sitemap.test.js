const { sitemap } = require('./index');
const { expect } = require('chai');
const sinon = require('sinon');
const Sitemapper = require('sitemapper');
const puppeteer = require('puppeteer');
const asyncLib = require('async');

describe('Sitemap', () => {
    let sitemapperFetchStub;
    let puppeteerLaunchStub;
    let asyncEachLimitStub;

    beforeEach(() => {
        sitemapperFetchStub = sinon.stub(Sitemapper.prototype, 'fetch');
        puppeteerLaunchStub = sinon.stub(puppeteer, 'launch');
        asyncEachLimitStub = sinon.stub(asyncLib, 'eachLimit');
    });

    afterEach(() => {
        sitemapperFetchStub.restore();
        puppeteerLaunchStub.restore();
        asyncEachLimitStub.restore();
    });

    it('should return sitemap from sitemap.xml if available', async () => {
        const websiteUrl = 'https://test.com';
        const sitemapXml = {
            sites: ['https://test.com/page1', 'https://test.com/page2'],
        };
        sitemapperFetchStub.resolves(sitemapXml);

        const result = await sitemap(websiteUrl);
        expect(result).to.deep.equal(sitemapXml);
    });

    it('should crawl website and return visited URLs if no sitemap.xml', async () => {
        const websiteUrl = 'https://test.com';
        const crawledUrls = ['https://test.com', 'https://test.com/page1', 'https://test.com/page2'];
        sitemapperFetchStub.rejects();
        puppeteerLaunchStub.returns({
            newPage: () => Promise.resolve({
                setUserAgent: () => {},
                goto: () => {},
                $$eval: () => Promise.resolve([]),
                close: () => {},
            }),
            close: () => {},
        });
        asyncEachLimitStub.callsFake((_, __, callback) => callback());

        const result = await sitemap(websiteUrl);
        expect(result).to.deep.equal(crawledUrls);
    });

    it('should handle errors during crawling', async () => {
        const websiteUrl = 'https://test.com';
        sitemapperFetchStub.rejects();
        puppeteerLaunchStub.returns({
            newPage: () => Promise.reject(new Error('Test error')),
            close: () => {},
        });

        try {
            await sitemap(websiteUrl);
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('Test error');
        }
    });
});
