const express = require('express');
const router = express.Router();
const multer = require('multer'); // for handling multipart/form-data (file uploads)
const Module = require('../../db/models/Module');
const Service = require('../../db/models/Service');
const extensionManager = require('./extension-manager');
const dockerComposeManager = require('./docker-manager');

// Set up multer for file uploads
const upload = multer({ dest: 'ext-uploads/' });

// Serve the main page
router.get('/', (req, res) => {
    res.render('install/views/index');
});

// Handle extension installation
router.post('/', upload.single('extensionZip'), async (req, res) => {
    try {
        const result = await extensionManager.installExtension(req.file.path);
        await dockerComposeManager.updateDockerCompose(result.services);
        res.redirect('/');
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

// API endpoint to get installed modules and services
router.get('/api/extensions', async (req, res) => {
    try {
        const modules = await Module.find({});
        const services = await Service.find({});
        res.json({ modules, services });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Handle extension uninstallation
router.post('/uninstall', express.json(), async (req, res) => {
    try {
        const { extensionName, type } = req.body;
        const result = await extensionManager.uninstallExtension(extensionName, type);
        await dockerComposeManager.updateDockerCompose(result.services);
        res.json({ success: true, message: 'Extension uninstalled successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
