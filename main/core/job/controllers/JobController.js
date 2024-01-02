const mongoose = require('mongoose');
const moment = require('moment');

const Job = require('../../../db/models/Job.js');
const Data = require('../../../db/models/Data.js');
const Template = require('../../../db/models/Template.js');
const Flow = require('../../../db/models/Flow.js');
const Output = require('../../../db/models/Output.js');
const Service = require('../../../db/models/Service.js');

const JobController = {
    getAllJobs: async (req, res) => {
        try {
            let jobs = await Job.find({});
            res.render('job/views/index', { title: 'job', items: jobs });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while fetching jobs');
        }
    },

    getNewJob: async (req, res) => {
        const { flow_id, project_id } = req.query;
        if (!flow_id || !project_id) {
            return res.status(400).send('Flow ID and Project ID are required.');
        }
        try {
            const services = await Service.find({});
            const templates = await Template.find({});
            const data = await Data.find({});
            const dependencies = await Job.find({ flow_id });
            res.render('job/views/new', { services, templates, data, dependencies, flow_id, project_id });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while fetching resources.');
        }
    },

    createJob: async (req, res) => {
        try {
            const flow_id = req.params.flow_id;
            const flow = await Flow.findById(flow_id);
            if (!flow) return res.status(404).send('Flow not found.');

            const { template_id, project_id } = req.body;
            const data = req.body.data || [];
            const dependencies = req.body.dependencies || [];

            if (!template_id) return res.status(400).send('Template ID is required.');
            const template = await Template.findById(template_id);
            if (!template) return res.status(404).send('Template not found.');

            const newJob = new Job({
                ...req.body,
                name: template.name,
                status: 'inactive',
                flow_id: flow_id,
                template: template_id,
                data: parseArrayField(data),
                dependencies: parseArrayField(dependencies),
            });

            await newJob.save();
            flow.jobs.push(newJob._id);
            await flow.save();

            res.redirect(`/project/${project_id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while creating the job.');
        }
    },

    getJobById: async (req, res) => {
        try {
            let job = await Job.findById(req.params.id)
                .populate([
                    { path: 'template', populate: { path: 'service', model: 'Service' } },
                    { path: 'data', model: Data },
                    { path: 'dependencies', model: Job },
                    { path: 'outputs', model: Output },
                    { path: 'service_', model: Service }
                ]);

            res.render('job/views/single', {
                title: 'Job',
                job,
                flow_id: req.query.flow_id,
                moment
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while fetching the job details');
        }
    },

    editJob: async (req, res) => {
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
    },

    updateJob: async (req, res) => {
        try {
            const job = await Job.findById(req.params.id);
            if (!job) {
                return res.status(404).send('Job not found');
            }

            if (req.body.action) {
                handleJobAction(req.body.action, job, req, res);
            } else {
                updateJobFields(job, req.body);
            }
            await job.save();
            res.redirect(`/flow/${req.body.flow_id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while updating the job.');
        }
    },

    duplicateJob: async (req, res) => {
        try {
            const originalJob = await Job.findById(req.params.id);
            if (!originalJob) {
                return res.status(404).send('Job not found');
            }

            const duplicateJob = new Job({
                ...originalJob.toObject(),
                _id: mongoose.Types.ObjectId(),
                status: 'inactive',
            });

            await duplicateJob.save();
            const flow = await Flow.findById(originalJob.flow_id);
            if (flow) {
                flow.jobs.push(duplicateJob._id);
                await flow.save();
            }

            res.redirect(`/flow/${originalJob.flow_id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while duplicating the job');
        }
    },

    deleteJob: async (req, res) => {
        try {
            await Job.findByIdAndDelete(req.params.id);
            res.redirect(`/flow/${req.query.flow_id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while deleting the job');
        }
    }
};

function parseArrayField(field) {
    if (Array.isArray(field)) return field;
    return field ? [field] : [];
}

function handleJobAction(action, job, req, res) {
    switch (action) {
        case 'cancel':
            job.status = 'inactive';
            job.queue_id = '';
            break;
        case 'rerun':
            job.status = 'open';
            job.queue_id = '';
            job.loop_counter = 0;
            handleRerunFlow(job.flow_id);
            break;
        default:
            throw new Error('Invalid action');
    }
}

async function handleRerunFlow(flowId) {
    const flow = await Flow.findById(flowId);
    if (!flow) throw new Error('Flow not found');
    flow.status = 'active';
    await flow.save();
}

function updateJobFields(job, fields) {
    const updatableFields = ['template_id', 'status', 'type', 'data', 'dependencies', 'service_id', 'queue_id', 'flow_output'];
    updatableFields.forEach(field => {
        if (fields[field] !== undefined) {
            job[field] = Array.isArray(fields[field]) ? fields[field] : [fields[field]];
        }
    });
}

module.exports = JobController;
