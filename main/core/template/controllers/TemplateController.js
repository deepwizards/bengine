const Template = require('../../../db/models/Template');
const Service = require('../../../db/models/Service');
const Block = require('../../../db/models/Block');
const Test = require('../../../db/models/Test');
const Group = require('../../../db/models/Group');

const TemplateController = {
    getAllTemplates: async (req, res) => {
        try {
            const templates = await Template.find().populate('type');
            res.render('template/views/index', { 
                templates,
                title: 'template'
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching templates');
        }
    },

    getNewTemplate: async (req, res) => {
        try {
            const services = await Service.find();
            res.render('template/views/new', {
                title: 'Create New Template',
                services
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching services');
        }
    },

    createTemplate: async (req, res) => {
        try {
            const newTemplate = new Template(req.body);
            await newTemplate.save();
            res.redirect(`/template/edit/${newTemplate._id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('Error creating template');
        }
    },

    getEditTemplate: async (req, res) => {
        const templateId = req.params.id;
        if (!templateId) {
            return res.status(400).send('No template ID provided');
        }
        try {
            const template = await Template.findById(templateId).populate(['service', 'inputs.block']);
            if (!template) {
                return res.status(404).send('Template not found');
            }
            const services = await Service.find();
            const blocks = await Block.find();
            const tests = await Test.find({ template_id: templateId });
            console.log(tests)
            const groups = await Group.find({type: 'Template'})
            const allTemplates = await Template.find({});
            const currentTemplateId = req.params.id;

            template.inputs.sort((a, b) => a.order - b.order);
            const preview = template.inputs.map(input => input.block.body).join('\n');

            res.render('template/views/edit', {
                title: `Edit ${template.name}`,
                template,
                services,
                blocks,
                preview,
                tests,
                groups,
                allTemplates,
                currentTemplateId
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching template details');
        }
    },

    updateTemplate: async (req, res) => {
        const templateId = req.params.id;
        if (!templateId) {
            return res.status(400).send('No template ID provided');
        }
        try {
            await Template.findByIdAndUpdate(templateId, req.body);
            res.redirect(`/template/edit/${templateId}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('Error updating template');
        }
    },

    saveVersion: async (req, res) => {
        const templateId = req.params.templateId;
        try {
            const template = await Template.findById(templateId);
            if (!template) {
                return res.status(404).send('Template not found');
            }
            const newVersion = template.addVersion(req.body.blocks);
            await template.save();
            res.status(200).json({ message: 'New version saved', version: newVersion });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error saving new version');
        }
    },

    lockTemplate: async (req, res) => {
        const templateId = req.params.templateId;
        try {
            await Template.findByIdAndUpdate(templateId, { is_locked: true });
            res.status(200).json({ message: 'Template locked' });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error locking template');
        }
    },

    unlockTemplate: async (req, res) => {
        const templateId = req.params.templateId;
        try {
            await Template.findByIdAndUpdate(templateId, { is_locked: false });
            res.status(200).json({ message: 'Template unlocked' });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error unlocking template');
        }
    },

    getVersion: async (req, res) => {
        const { templateId, versionId } = req.params;
        try {
            const template = await Template.findById(templateId);
            if (!template) {
                return res.status(404).send('Template not found');
            }
            const version = template.versions.id(versionId);
            if (!version) {
                return res.status(404).send('Version not found');
            }
            res.status(200).json(version);
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching version details');
        }
    }
};

module.exports = TemplateController;
