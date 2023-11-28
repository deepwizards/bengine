const express = require('express');
const router = express.Router();
const ProjectController = require('./controllers/ProjectController');
const FlowController = require('./controllers/FlowController');
const JobController = require('./controllers/JobController');

// Project routes
router.get('/', ProjectController.getAllProjects);
router.get('/new', ProjectController.getNewProject);
router.post('/create', ProjectController.createProject);
router.get('/:id', ProjectController.getProjectById);
router.get('/edit/:id', ProjectController.editProject);
router.get('/activate/:id', ProjectController.activateProject);
router.get('/cancel/:id', ProjectController.cancelProject);
router.post('/update/:id', ProjectController.updateProject);
router.post('/replace/data/:project_id', ProjectController.replaceData);
router.post('/replace/dependencies/:project_id', ProjectController.replaceDependencies);
router.post('/duplicate/:project_id', ProjectController.duplicateProject);
router.get('/mergeOutputs/:projectId', ProjectController.mergeOutputs);
router.get('/downloadOutputs/:projectId', ProjectController.downloadOutputs);
router.post('/delete/:id', ProjectController.deleteProject);

// Flow routes
router.post('/flow/new/:projectId', FlowController.createFlow);

// Job routes
router.get('/api/jobs/:flowId', JobController.getJobsByFlowId);
router.get('/api/job/:id', JobController.getJobById);

module.exports = router;
