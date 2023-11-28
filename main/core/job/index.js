const router = require('express').Router();
const JobController = require('./controllers/JobController');

// Job routes
router.get('/', JobController.getAllJobs);
router.get('/new', JobController.getNewJob);
router.post('/create/:flow_id', JobController.createJob);
router.get('/:id', JobController.getJobById);
router.get('/edit/:id', JobController.editJob);
router.post('/update/:id', JobController.updateJob);
router.post('/duplicate/:id', JobController.duplicateJob);
router.get('/delete/:id', JobController.deleteJob);

module.exports = router;
