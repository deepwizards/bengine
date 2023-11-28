const router = require('express').Router();
const mongoose = require('mongoose');
const axios = require('axios');
const Service = require('../../db/models/Service');
const Template = require('../../db/models/Template');
const Block = require('../../db/models/Block');
const Data = require('../../db/models/Data');
const Group = require('../../db/models/Group');
const Test = require('../../db/models/Test');

router.get('/', async (req, res) => {
    try {
        const templates = await Template.find().populate('type');
        res.render('template/views/index', { 
            templates,
            title: 'template' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/new', async (req, res) => {
    const services = await Service.find();
    res.render('template/views/new', {
        title: 'Create New Template',
        services
    });
});

router.post('/create', async (req, res) => {
    const newTemplate = new Template(req.body);
    await newTemplate.save();
    res.redirect(`/template/edit/${newTemplate._id}`);
});

router.get('/edit/:id', async (req, res) => {
    const templateId = req.params.id;
    const services = await Service.find();
    const blocks = await Block.find();
    const tests = await Test.find({template_id: templateId});
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).send('Invalid template ID.');
    }
    const currentTemplateId = req.params.id;
    const allTemplates = await Template.find({});
    const groups = await Group.find({type: 'Template'})
    const template = await Template.findById(templateId).populate(['service', 'inputs.block']);
    if (!template) {
        return res.status(404).send('Template not found.');
    }
    template.inputs.sort((a, b) => a.order - b.order);
    const preview = template.inputs.map(input => input.block.body).join('\n');
    res.render('template/views/edit', {
        title: `Edit ${template.name}`,
        template,
        allTemplates,
        groups,
        currentTemplateId,
        blocks,
        services,
        preview,
        tests
    });
});

router.post('/version/:templateId/save', async (req, res) => {
    try {
        const templateId = req.params.templateId;
        const { blocks } = req.body; // Assuming blocks are sent in the request body
        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        const newVersion = template.addVersion(blocks);
        await template.save();
        res.status(200).json({ message: 'New version saved', version: newVersion });
    } catch (error) {
        res.status(500).json({ message: 'Error saving new version', error: error.message });
    }
});

router.post('/lock/:templateId', async (req, res) => {
    try {
        const templateId = req.params.templateId;
        await Template.findByIdAndUpdate(templateId, { is_locked: true });
        res.status(200).json({ message: 'Template locked', is_locked: true });
    } catch (error) {
        res.status(500).json({ message: 'Error locking the template', error: error.message });
    }
});

router.post('/unlock/:templateId', async (req, res) => {
    try {
        const templateId = req.params.templateId;
        await Template.findByIdAndUpdate(templateId, { is_locked: false });
        res.status(200).json({ message: 'Template unlocked', is_locked: false });
    } catch (error) {
        res.status(500).json({ message: 'Error unlocking the template', error: error.message });
    }
});

router.post('/update/:templateId', async (req, res) => {
    const templateId = req.params.templateId; // Corrected this line
    await Template.findByIdAndUpdate(templateId, req.body);
    res.redirect(`/template/edit/${templateId}`);
});

router.post('/edit/:id/block', async (req, res) => {
    const { action, blockId, type, name, body } = req.body;
    const templateId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(templateId) || (blockId && !mongoose.Types.ObjectId.isValid(blockId))) {
        return res.status(400).json({ success: false, message: "Invalid IDs provided." });
    }
    const template = await Template.findById(templateId);
    if (!template) {
        return res.status(404).json({ success: false, message: "Template not found." });
    }
    template.inputs.sort((a, b) => a.order - b.order);
    if (!action) {
        try {
            let newBlock;
            if (blockId) {
                const existingBlock = await Block.findById(blockId);
                if (!existingBlock) {
                    return res.status(404).json({ success: false, message: "Block not found." });
                }
                newBlock = new Block({
                    name: existingBlock.name,
                    body: existingBlock.body,
                    type: existingBlock.type
                });
            } else {
                newBlock = new Block({
                    name: name || "New Block",
                    body: body || "Edit this block...",
                    type
                });
            }
            await newBlock.save();
            template.inputs.push({
                block: newBlock._id,
                order: template.inputs.length + 1
            });
            await template.save();
            return res.json({ success: true, message: "Block added successfully." });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    } else {
        const blockIndex = template.inputs.findIndex(b => b.block.toString() === blockId);
        if (blockIndex === -1) {
            return res.status(404).json({ success: false, message: "Block not found." });
        }
        switch (action) {
            case 'moveUp':
                if (blockIndex > 0) {
                    [template.inputs[blockIndex].order, template.inputs[blockIndex - 1].order] = [template.inputs[blockIndex - 1].order, template.inputs[blockIndex].order];
                }
                break;
            case 'moveDown':
                if (blockIndex < template.inputs.length - 1) {
                    [template.inputs[blockIndex].order, template.inputs[blockIndex + 1].order] = [template.inputs[blockIndex + 1].order, template.inputs[blockIndex].order];
                }
                break;
            case 'delete':
                template.inputs.splice(blockIndex, 1);
                await Block.findByIdAndDelete(blockId);
                for (let i = blockIndex; i < template.inputs.length; i++) {
                    template.inputs[i].order = i + 1;
                }
                break;
            default:
                return res.status(400).json({ success: false, message: "Invalid action provided." });
        }
        await template.save();
        return res.json({ success: true, message: "Action processed successfully." });
    }
});

router.get('/test/:templateId',  async (req, res) => {
    try {
        const templateId = req.params.templateId;
        if (!mongoose.Types.ObjectId.isValid(templateId)) {
            return res.status(400).json({ success: false, message: "Invalid template ID." });
        }
        const template = await Template.findById(templateId).populate('inputs.block');
        const blocks = template.inputs.map(input => input.block);
        const processBlocks = async (blocks) => {
            let result = "";
            for (const block of blocks) {
                let blockData;
                switch (block.type.toString()) {
                    case 'data':
                        blockData = await Data.findById(block.data);
                        result+=blockData.body;
                        break;
                    case 'text':
                        result+=block.body;
                        break;
                }
            }
            return result;
        };
        const processedData = await processBlocks(blocks);
        const gptResponse = await axios.post('http://localhost:3001/gpt', {data: processedData});
        const promptOutput = gptResponse.data;
        const newTest = new Test({
            template_id: template._id,
            template_version: template.current_version || 'alpha',
            result: JSON.stringify(promptOutput)
        });
        await newTest.save();
        const response = {
            success: true,
            data: promptOutput
        };
        res.status(201).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }   
});

router.get('/templates/:templateId/version/:versionId', async (req, res) => {
    try {
        const { templateId, versionId } = req.params;
        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        const version = template.versions.id(versionId);
        if (!version) {
            return res.status(404).json({ message: 'Version not found' });
        }
        res.status(200).json(version);
    } catch (error) {
        res.status(500).json({ message: 'Error loading version', error: error.message });
    }
});

router.post('/edit/:templateId/block/:blockId/update', async (req, res) => {
    try {
        const { blockId } = req.params;
        const { body, name } = req.body;
        if (!mongoose.Types.ObjectId.isValid(blockId)) {
            return res.status(400).json({ success: false, message: "Invalid block ID." });
        }
        const block = await Block.findById(blockId);
        if (!block) {
            return res.status(404).json({ success: false, message: "Block not found." });
        }
        if (body !== undefined) {
            block.body = body;
        }
        if (name !== undefined) {
            block.name = name;
        }
        await block.save();
        res.json({ success: true, message: "Block updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
