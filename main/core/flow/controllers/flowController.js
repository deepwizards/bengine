const Flow = require('../../../db/models/Flow.js');
const Job = require('../../../db/models/Job.js');

exports.createFlow = async (req, res) => {
    try {
        const flow = new Flow({ ...req.body, status: 'inactive' });
        await flow.save();
        res.redirect(`/flow/${flow._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating flow');
    }
};

exports.updateFlow = async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.id);
        if (!flow) {
            return res.status(404).send({ message: 'Flow not found' });
        }

        const { action } = req.body;
        if (action) {
            switch (action) {
                case 'cancel':
                    flow.status = 'inactive';
                    const jobsToCancel = await Job.find({ flow_id: flow._id });
                    for (const job of jobsToCancel) {
                        job.status = 'inactive';
                        await job.save();
                    }
                    break;
                case 'rerun':
                    flow.status = 'open';
                    const jobsToRerun = await Job.find({ flow_id: flow._id });
                    for (const job of jobsToRerun) {
                        job.status = 'open';
                        await job.save();
                    }
                    break;
                default:
                    return res.status(400).send({ message: 'Invalid action' });
            }
        } else {
            const updateableFields = ['name', 'description', 'status', 'project_id', 'data', 'dependencies', 'outputs', 'loop', 'loops'];
            updateableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (field === 'data' || field === 'dependencies' || field === 'outputs') {
                        flow[field] = Array.isArray(req.body[field]) ? req.body[field] : [req.body[field]];
                    } else {
                        flow[field] = req.body[field];
                    }
                }
            });
        }

        await flow.save();
        res.redirect(`/flow/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating flow');
    }
};


exports.activateFlow = async (req, res) => {
    try {
        const flow = await Flow.findByIdAndUpdate(req.params.id, { status: 'active' });
        if (flow && flow.jobs && flow.jobs.length > 0) {
            for (const jobId of flow.jobs) {
                await Job.findByIdAndUpdate(jobId, { flow_id: flow._id, status: 'open' });
            }
        }
        res.redirect(`/dashboard`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error activating flow');
    }
};

exports.deleteFlow = async (req, res) => {
    try {
        await Flow.findByIdAndDelete(req.params.id);
        res.redirect('/flow');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting flow');
    }
};

module.exports = exports;
