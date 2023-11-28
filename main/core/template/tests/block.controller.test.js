const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const BlockController = require('../controllers/BlockController');
const Block = require('../../../db/models/Block');
const Template = require('../../../db/models/Template');

jest.mock('../../../db/models/Block');
jest.mock('../../../db/models/Template');
mongoose.Types.ObjectId.isValid = jest.fn();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/block', BlockController);

describe('BlockController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleBlockAction', () => {
        it('should add a new block to a template', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Template.findById.mockResolvedValue({ _id: '123', inputs: [], save: jest.fn() });
            Block.mockImplementation(() => ({ _id: '456', save: jest.fn() }));

            const response = await request(app).post('/block/action/123').send({ type: 'text', name: 'Test Block', body: 'Test Body' });
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: "Block added successfully." });
        });

        it('should handle template not found', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Template.findById.mockResolvedValue(null);

            const response = await request(app).post('/block/action/123');
            expect(response.status).toBe(404);
        });
    });

    describe('handleBlockAction - moveUp and moveDown', () => {
        beforeEach(() => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Template.findById.mockResolvedValue({
                _id: '123',
                inputs: [
                    { block: 'block1', order: 1 },
                    { block: 'block2', order: 2 }
                ],
                save: jest.fn()
            });
        });
    
        it('should move a block up', async () => {
            const response = await request(app).post('/block/action/123').send({ action: 'moveUp', blockId: 'block2' });
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: "Action processed successfully." });
        });
    
        it('should move a block down', async () => {
            const response = await request(app).post('/block/action/123').send({ action: 'moveDown', blockId: 'block1' });
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: "Action processed successfully." });
        });
    
        it('should handle move action on first/last block', async () => {
            let response = await request(app).post('/block/action/123').send({ action: 'moveUp', blockId: 'block1' });
            expect(response.status).toBe(200); // Since no actual move is performed, success is expected.
    
            response = await request(app).post('/block/action/123').send({ action: 'moveDown', blockId: 'block2' });
            expect(response.status).toBe(200);
        });
    });
    
    describe('handleBlockAction - delete', () => {
        it('should delete a block', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Template.findById.mockResolvedValue({
                _id: '123',
                inputs: [{ block: 'block1', order: 1 }, { block: 'block2', order: 2 }],
                save: jest.fn()
            });
            Block.findByIdAndDelete.mockResolvedValue({});
    
            const response = await request(app).post('/block/action/123').send({ action: 'delete', blockId: 'block1' });
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: "Action processed successfully." });
        });
    
        it('should handle deletion of non-existent block', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Template.findById.mockResolvedValue({
                _id: '123',
                inputs: [{ block: 'block1', order: 1 }],
                save: jest.fn()
            });
    
            const response = await request(app).post('/block/action/123').send({ action: 'delete', blockId: 'nonexistent' });
            expect(response.status).toBe(404);
        });
    });
    
    describe('handleBlockAction - invalid action', () => {
        it('should handle invalid action', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Template.findById.mockResolvedValue({ _id: '123', inputs: [], save: jest.fn() });
    
            const response = await request(app).post('/block/action/123').send({ action: 'invalidAction', blockId: 'block1' });
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ success: false, message: "Invalid action provided." });
        });
    });
    
    describe('handleBlockAction - invalid template ID', () => {
        it('should handle invalid template ID', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(false);
    
            const response = await request(app).post('/block/action/invalidId');
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ success: false, message: "Invalid template ID." });
        });
    });
    

    describe('updateBlock', () => {
        it('should update an existing block', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Block.findById.mockResolvedValue({ _id: '456', save: jest.fn() });

            const response = await request(app).put('/block/456').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: "Block updated successfully." });
        });

        it('should handle block not found', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
            Block.findById.mockResolvedValue(null);

            const response = await request(app).put('/block/456').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(404);
        });
    });

    describe('updateBlock - invalid block ID', () => {
        it('should handle invalid block ID', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(false);
    
            const response = await request(app).put('/block/invalidId').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ success: false, message: "Invalid block ID." });
        });
    });
    
    describe('updateBlock - error handling in Block.findByIdAndUpdate', () => {
        beforeEach(() => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        });
    
        it('should handle errors in finding block', async () => {
            Block.findById.mockRejectedValue(new Error('Error finding block'));
    
            const response = await request(app).put('/block/123').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ success: false, message: "Error updating block: Error finding block" });
        });
    
        it('should handle errors in saving block', async () => {
            const mockBlock = { _id: '123', save: jest.fn().mockRejectedValue(new Error('Error saving block')) };
            Block.findById.mockResolvedValue(mockBlock);
    
            const response = await request(app).put('/block/123').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ success: false, message: "Error updating block: Error saving block" });
        });
    });

    describe('updateBlock - invalid block ID', () => {
        it('should handle invalid block ID', async () => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(false);
    
            const response = await request(app).put('/block/invalidId').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ success: false, message: "Invalid block ID." });
        });
    });
    
    describe('updateBlock - error handling in Block.findByIdAndUpdate', () => {
        beforeEach(() => {
            mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        });
    
        it('should handle errors in finding block', async () => {
            Block.findById.mockRejectedValue(new Error('Error finding block'));
    
            const response = await request(app).put('/block/123').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ success: false, message: "Error updating block: Error finding block" });
        });
    
        it('should handle errors in saving block', async () => {
            const mockBlock = { _id: '123', save: jest.fn().mockRejectedValue(new Error('Error saving block')) };
            Block.findById.mockResolvedValue(mockBlock);
    
            const response = await request(app).put('/block/123').send({ name: 'Updated Name', body: 'Updated Body' });
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ success: false, message: "Error updating block: Error saving block" });
        });
    });
    
});
