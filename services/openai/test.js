const { gpt } = require('./index');
const { expect } = require('chai');
const sinon = require('sinon');
const { OpenAIApi } = require('openai');

describe('GPT', () => {
    let openaiStub;

    beforeEach(() => {
        openaiStub = sinon.stub(OpenAIApi.prototype, 'createCompletion');
    });

    afterEach(() => {
        openaiStub.restore();
    });

    it('should return response text on success', async () => {
        const prompt = 'test prompt';
        const expectedResult = 'test result';
        openaiStub.resolves({
            data: {
                choices: [{ text: expectedResult }]
            }
        });

        const result = await gpt(prompt);
        expect(result).to.equal(expectedResult);
    });

    it('should throw an error if prompt is missing', async () => {
        try {
            await gpt(null);
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('Prompt argument required');
        }
    });

    it('should reject with error if API call fails', async () => {
        const prompt = 'test prompt';
        const apiError = new Error('API error');
        openaiStub.rejects(apiError);

        try {
            await gpt(prompt);
        } catch (error) {
            expect(error).to.equal(apiError);
        }
    });
});
