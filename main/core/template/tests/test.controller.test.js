const request = require('supertest');
const express = require('express');
const axios = require('axios');
const TestController = require('../controllers/TestController');
const Template = require('../../../db/models/Template');
const Test = require('../../../db/models/Test');
const Data = require('../../../db/models/Data');

jest.mock('axios');
jest.mock('../../../db/models/Template');
jest.mock('../../../db/models/Test');
jest.mock('../../../db/models/Data');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/test', TestController);

describe('TestController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('testTemplate', () => {
        it('should process and test a template successfully', async () => {
            const mockTemplate = {
                _id: '123',
                inputs: [{ block: { type: 'text', body: 'Sample text' } }],
                current_version: '1.0'
            };
            Template.findById.mockResolvedValue(mockTemplate);
            axios.post.mockResolvedValue({ data: 'Processed GPT Response' });

            const response = await request(app).post('/test/template/123');
            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                success: true,
                data: 'Processed GPT Response'
            });
            expect(Test.mock.calls.length).toBe(1);
        });

        it('should return 404 if the template is not found', async () => {
            Template.findById.mockResolvedValue(null);

            const response = await request(app).post('/test/template/123');
            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                message: "Template not found."
            });
        });

        it('should handle errors in processing blocks', async () => {
            Template.findById.mockResolvedValue({
                _id: '123',
                inputs: [{ block: { type: 'data', data: '456' } }]
            });
            Data.findById.mockResolvedValue(null);

            const response = await request(app).post('/test/template/123');
            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                message: 'Data block not found.'
            });
        });

        it('should handle axios request errors', async () => {
            const mockTemplate = {
                _id: '123',
                inputs: [{ block: { type: 'text', body: 'Sample text' } }],
                current_version: '1.0'
            };
            Template.findById.mockResolvedValue(mockTemplate);
            axios.post.mockRejectedValue(new Error('Axios request failed'));

            const response = await request(app).post('/test/template/123');
            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                message: 'Axios request failed'
            });
        });
    });
});
