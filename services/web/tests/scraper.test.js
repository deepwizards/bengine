const { scraper } = require('./index');
const { expect } = require('chai');
const sinon = require('sinon');
const https = require('https');
const events = require('events');

describe('Scraper', () => {
    let httpsGetStub;

    beforeEach(() => {
        httpsGetStub = sinon.stub(https, 'get');
    });

    afterEach(() => {
        httpsGetStub.restore();
    });

    it('should return scraped data on success', async () => {
        const url = 'https://test.com';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test</title>
            </head>
            <body>
                <h1>Header 1</h1>
                <p>Test paragraph.</p>
                <img src="test.png">
                <a href="https://test.com/page">Inbound Link</a>
                <a href="https://example.com">Outbound Link</a>
            </body>
            </html>
        `;
        const response = new events.EventEmitter();
        const request = new events.EventEmitter();

        httpsGetStub.callsArgWith(1, response).returns(request);

        response.emit('data', html);
        response.emit('end');

        const result = await scraper(url);
        expect(result).to.have.property('inboundLinks');
        expect(result).to.have.property('outboundLinks');
        expect(result).to.have.property('images');
        expect(result).to.have.property('imageUrls');
        expect(result).to.have.property('headers');
        expect(result).to.have.property('lists');
        expect(result).to.have.property('text');
        expect(result).to.have.property('structure');
    });

    it('should reject with error if API call fails', async () => {
        const url = 'https://test.com';
        const apiError = new Error('API error');
        const request = new events.EventEmitter();

        httpsGetStub.returns(request);

        request.emit('error', apiError);

        try {
            await scraper(url);
        } catch (error) {
            expect(error).to.equal(apiError);
        }
    });
});
