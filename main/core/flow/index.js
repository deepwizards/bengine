const router = require('express').Router();

const flowController = require('./controllers/flowController');
const flowViewController = require('./controllers/flowViewController');
const flowOutputController = require('./controllers/flowOutputController');

// View routes
router.get('/', flowViewController.showAllFlows);
router.get('/new', flowViewController.showCreateFlow);
router.get('/:id', flowViewController.showFlowDetails);
router.get('/edit/:id', flowViewController.showEditFlow);

// Action routes
router.post('/create', flowController.createFlow);
router.post('/update/:id', flowController.updateFlow);
router.get('/activate/:id', flowController.activateFlow);
router.post('/delete/:id', flowController.deleteFlow);

// Output routes TODO: combine with project and job output routes
router.get('/mergeOutputs/:flowId', flowOutputController.mergeOutputs);
router.get('/downloadOutputs/:flowId', flowOutputController.downloadOutputs);

module.exports = router;
