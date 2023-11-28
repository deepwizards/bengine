const router = require('express').Router();

const TemplateController = require('./controllers/TemplateController');
const BlockController = require('./controllers/BlockController');
const TestController = require('./controllers/TestController');

const { validateObjectId } = require('../../helpers/utils');

// Routes for Template
router.route('/')
    .get(TemplateController.getAllTemplates);

router.route('/new')
    .get(TemplateController.getNewTemplate);

router.route('/create')
    .post(TemplateController.createTemplate);

router.route('/edit/:id')
    .get(validateObjectId, TemplateController.getEditTemplate)
    .post(validateObjectId, TemplateController.updateTemplate);

router.route('/version/:templateId/save')
    .post(validateObjectId, TemplateController.saveVersion);

router.route('/lock/:templateId')
    .post(validateObjectId, TemplateController.lockTemplate);

router.route('/unlock/:templateId')
    .post(validateObjectId, TemplateController.unlockTemplate);

router.route('/templates/:templateId/version/:versionId')
    .get(validateObjectId, TemplateController.getVersion);

// Routes for Block
router.route('/edit/:templateId/block')
    .post(validateObjectId, BlockController.handleBlockAction);

router.route('/edit/:templateId/block/:blockId/update')
    .post(validateObjectId, BlockController.updateBlock);

// Routes for Test
router.route('/test/:templateId')
    .get(validateObjectId, TestController.testTemplate);

module.exports = router;
