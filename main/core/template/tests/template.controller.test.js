const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const TemplateController = require('../controllers/TemplateController');
const Template = require('../../../db/models/Template');
const Service = require('../../../db/models/Service');
const Block = require('../../../db/models/Block');
const Test = require('../../../db/models/Test');
const Group = require('../../../db/models/Group');

jest.mock('../../../db/models/Template');
jest.mock('../../../db/models/Service');
jest.mock('../../../db/models/Block');
jest.mock('../../../db/models/Test');
jest.mock('../../../db/models/Group');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('views', './views');
app.set('view engine', 'ejs');
app.use('/template', TemplateController);

describe('TemplateController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllTemplates', () => {
        it('should return a list of templates', async () => {
            Template.find.mockResolvedValue([{ name: 'Template1' }, { name: 'Template2' }]);
            const response = await request(app).get('/template');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Template1');
            expect(response.text).toContain('Template2');
        });

        it('should handle errors', async () => {
            Template.find.mockRejectedValue(new Error('Database error'));
            const response = await request(app).get('/template');
            expect(response.status).toBe(500);
            expect(response.text).toContain('Error fetching templates');
        });
    });

    describe('getNewTemplate', () => {
        it('should render page for creating a new template', async () => {
            Service.find.mockResolvedValue([{ name: 'Service1' }, { name: 'Service2' }]);
            const response = await request(app).get('/template/new');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Create New Template');
            expect(response.text).toContain('Service1');
            expect(response.text).toContain('Service2');
        });

        it('should handle errors', async () => {
            Service.find.mockRejectedValue(new Error('Database error'));
            const response = await request(app).get('/template/new');
            expect(response.status).toBe(500);
            expect(response.text).toContain('Error fetching services');
        });
    });

    describe('createTemplate', () => {
        it('should create a new template and redirect', async () => {
            const mockTemplate = { save: jest.fn(), _id: mongoose.Types.ObjectId() };
            Template.mockImplementation(() => mockTemplate);

            const response = await request(app).post('/template').send({ name: 'New Template' });
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe(`/template/edit/${mockTemplate._id}`);
            expect(mockTemplate.save).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            Template.mockImplementation(() => {
                return { save: jest.fn().mockRejectedValue(new Error('Database error')) };
            });

            const response = await request(app).post('/template').send({ name: 'New Template' });
            expect(response.status).toBe(500);
            expect(response.text).toContain('Error creating template');
        });
    });

    describe('getEditTemplate', () => {
        it('should render the edit page for a template', async () => {
            Template.findById.mockResolvedValue({ name: 'Existing Template', inputs: [], versions: [] });
            Service.find.mockResolvedValue([]);
            Block.find.mockResolvedValue([]);
            Test.find.mockResolvedValue([]);
            Group.find.mockResolvedValue([]);
    
            const response = await request(app).get('/template/edit/123');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Edit Existing Template');
        });
    
        it('should handle missing template ID', async () => {
            const response = await request(app).get('/template/edit/');
            expect(response.status).toBe(400);
        });
    
        it('should handle non-existent templates', async () => {
            Template.findById.mockResolvedValue(null);
            const response = await request(app).get('/template/edit/123');
            expect(response.status).toBe(404);
        });
    });
    
    describe('updateTemplate', () => {
        it('should update a template and redirect', async () => {
            const response = await request(app).post('/template/edit/123').send({ name: 'Updated Template' });
            expect(response.status).toBe(302);
            expect(Template.findByIdAndUpdate).toHaveBeenCalledWith(expect.anything(), { name: 'Updated Template' });
        });
    
        it('should handle missing template ID', async () => {
            const response = await request(app).post('/template/edit/').send({ name: 'Updated Template' });
            expect(response.status).toBe(400);
        });
    
        it('should handle update errors', async () => {
            Template.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));
            const response = await request(app).post('/template/edit/123').send({ name: 'Updated Template' });
            expect(response.status).toBe(500);
        });
    });
    
    describe('saveVersion', () => {
        it('should save a new version of the template', async () => {
            const mockTemplate = {
                findById: jest.fn().mockResolvedValue({
                    addVersion: jest.fn(),
                    save: jest.fn(),
                    _id: '123'
                })
            };
            Template.findById.mockResolvedValue(mockTemplate);
            const response = await request(app).post('/template/version/123').send({ blocks: [] });
            expect(response.status).toBe(200);
            expect(mockTemplate.addVersion).toHaveBeenCalled();
            expect(mockTemplate.save).toHaveBeenCalled();
        });
    
        it('should handle non-existent templates', async () => {
            Template.findById.mockResolvedValue(null);
            const response = await request(app).post('/template/version/123').send({ blocks: [] });
            expect(response.status).toBe(404);
        });
    
        it('should handle save errors', async () => {
            Template.findById.mockResolvedValue({
                addVersion: jest.fn(),
                save: jest.fn().mockRejectedValue(new Error('Database error'))
            });
            const response = await request(app).post('/template/version/123').send({ blocks: [] });
            expect(response.status).toBe(500);
        });
    });
    
    describe('lockTemplate and unlockTemplate', () => {
        it('should lock and unlock a template', async () => {
            const lockResponse = await request(app).post('/template/lock/123');
            expect(lockResponse.status).toBe(200);
            expect(Template.findByIdAndUpdate).toHaveBeenCalledWith('123', { is_locked: true });
    
            const unlockResponse = await request(app).post('/template/unlock/123');
            expect(unlockResponse.status).toBe(200);
            expect(Template.findByIdAndUpdate).toHaveBeenCalledWith('123', { is_locked: false });
        });
    
        it('should handle locking and unlocking errors', async () => {
            Template.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));
            const lockResponse = await request(app).post('/template/lock/123');
            expect(lockResponse.status).toBe(500);
    
            const unlockResponse = await request(app).post('/template/unlock/123');
            expect(unlockResponse.status).toBe(500);
        });
    });
    
    describe('getVersion', () => {
        it('should retrieve a specific version of a template', async () => {
            const mockTemplate = {
                versions: {
                    id: jest.fn().mockReturnValue({ versionData: 'data' })
                }
            };
            Template.findById.mockResolvedValue(mockTemplate);
    
            const response = await request(app).get('/template/version/123/456');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ versionData: 'data' });
        });
    
        it('should handle non-existent templates or versions', async () => {
            Template.findById.mockResolvedValue(null);
            let response = await request(app).get('/template/version/123/456');
            expect(response.status).toBe(404);
    
            Template.findById.mockResolvedValue({ versions: { id: jest.fn().mockReturnValue(null) } });
            response = await request(app).get('/template/version/123/456');
            expect(response.status).toBe(404);
        });
    
        it('should handle errors', async () => {
            Template.findById.mockRejectedValue(new Error('Database error'));
            const response = await request(app).get('/template/version/123/456');
            expect(response.status).toBe(500);
        });
    });
    
});

module.exports = TemplateController;
