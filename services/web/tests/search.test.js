const { search } = require('./index');
const { expect } = require('chai');
const sinon = require('sinon');
const SerpApi = require('google-search-results-nodejs');

describe('Search', () => {
    let serpApiStub;

    beforeEach(() => {
        serpApiStub = sinon.stub(SerpApi.GoogleSearch.prototype, 'json');
    });

    afterEach(() => {
        serpApiStub.restore();
    });

    it('should return data on success', async () => {
        const query = 'test query';
        const expectedData = { success: true };
        serpApiStub.callsArgWith(1, expectedData);

        const result = await search(query);
        expect(result).to.deep.equal(expectedData);
    });

    it('should throw an error if query is missing', async () => {
        try {
            await search(null);
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('Must provide a query!');
        }
    });

    it('should reject with error if API call fails', async () => {
        const query = 'test query';
        const apiError = new Error('API error');
        serpApiStub.throws(apiError);

        try {
            await search(query);
        } catch (error) {
            expect(error).to.equal(apiError);
        }
    });
});
