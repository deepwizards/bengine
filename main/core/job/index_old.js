const router = require('express').Router();
const mongoose = require('mongoose');
const moment = require('moment');
const Job = require('../../db/models/Job.js');
const Data = require('../../db/models/Data.js');
const Template = require('../../db/models/Template.js');
const Flow = require('../../db/models/Flow.js');
const Output = require('../../db/models/Output.js');
const Service = require('../../db/models/Service.js');

router.get('/', async (req, res) => {
    let items = await Job.find({});
    res.render('job/views/index', {
        title: 'job',
        items: items,
    });
});

router.get('/new', async (req, res) => {
    const { flow_id, project_id } = req.query;
    if (!flow_id || !project_id) {
        return res.status(400).send('Flow ID and Project ID are required.');
    }
    try {
        const services = await Service.find({});
        const templates = await Template.find({});
        const data = await Data.find({});
        const dependencies = await Job.find({ flow_id });
        res.render('job/views/new', { 
            services, templates, data, dependencies, flow_id, project_id 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching resources.');
    }
});

router.post('/create/:flow_id', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flow_id);
        if (!flow) return res.status(404).send('Flow not found.');
        const { data, dependencies, template_id, project_id } = req.body;
        if (!template_id) return res.status(400).send('Template ID is required.');
        const template = await Template.findById(template_id);
        if (!template) return res.status(404).send('Template not found.');
        // Parse 'data' and 'dependencies' fields to ensure they are arrays
        const parseArrayField = (field) => {
            if (Array.isArray(field)) return field;
            return field ? [field] : [];
        };
        const dataIds = parseArrayField(data);
        const dependencyIds = parseArrayField(dependencies);

        const newJob = new Job({
            name: template.name,
            status: 'inactive',
            flow_id: req.params.flow_id,
            template: template_id,
            data: dataIds,
            dependencies: dependencyIds,
            loop: req.body.loop,
            loops: req.body.loops,
            loop_counter: req.body.loop_counter,
            loop_array: req.body.loop_array,
            flow_output: req.body.flow_output,
            project_output: req.body.project_output
        });
        await newJob.save();
        flow.jobs.push(newJob._id);
        await flow.save();
        res.redirect(`/project/${project_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while creating the job.');
    }
});

router.get('/:id', async (req, res) => {
    const flow_id = req.query.flow_id;
        let job = await Job.findById(req.params.id)
            .populate([{
                path: 'template',
                    populate: {
                        path: 'service',
                        model: 'Service'
                    }
                },
                { path: 'data', model: Data },
                { path: 'dependencies', model: Job },
                { path: 'outputs', model: Output },
                { path: 'service_', model: Service }
            ]);
        res.render('job/views/single', {
            title: 'Job',
            job,
            flow_id,
            moment
        });
});

router.get('/edit/:id', async (req, res) => {
    try {
        let job = await Job.findById(req.params.id);
        const templates = await Template.find();
        const data = await Data.find();
        const dependencies = await Job.find({ flow_id: job.flow_id });
        const service = await Service.findById(job.service_id);
        res.render('job/views/edit', {
            title: 'Edit Job',
            job,
            templates,
            data,
            dependencies,
            service
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching the job details');
    }
});

router.post('/update/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).send({ message: 'Job not found' });
        }
        const { action, flow_id } = req.body;
        if (action) {
            switch (action) {
                case 'cancel':
                    job.status = 'inactive';
                    job.queue_id = '';
                    break;
                case 'rerun':
                    job.status = 'open';
                    job.queue_id = '';
                    job.loop_counter = 0;
                    const flow = await Flow.findById(job.flow_id );
                    flow.status = 'active';
                    await flow.save();
                    break;
                default:
                    return res.status(400).send({ message: 'Invalid action' });
            }
        } else {
            const updateableFields = ['template_id', 'status', 'type', 'data', 'dependencies', 'service_id', 'queue_id', 'flow_output'];
            updateableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (field === 'data' || field === 'dependencies') {
                        job[field] = Array.isArray(req.body[field]) ? req.body[field] : [req.body[field]];
                    } else {
                        job[field] = req.body[field];
                    }
                }
            });
        }
        await job.save();
        return res.redirect(`/flow/${flow_id}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'An error occurred while updating the job.' });
    }
});

router.post('/duplicate/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) throw new Error('Job not found');
        const duplicateJob = new Job({
            ...job.toObject(),
            _id: mongoose.Types.ObjectId(),
            status: 'inactive',
        });
        await duplicateJob.save();
        // Push the duplicate job id to the flow's job list
        const flow = await Flow.findById(job.flow_id);
        if (flow) {
            flow.jobs.push(duplicateJob._id);
            await flow.save();
        }
        res.redirect(`/flow/${job.flow_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while duplicating the job');
    }
});

router.get('/delete/:id', async (req, res) => {
    await Job.findByIdAndDelete(req.params.id);
    res.redirect(`/flow/${req.query.flow_id}`);
});

module.exports = router;
