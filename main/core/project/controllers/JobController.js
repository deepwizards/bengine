const Job = require('../../../db/models/Job');
const Flow = require('../../../db/models/Flow');
const Data = require('../../../db/models/Data');
const Service = require('../../../db/models/Service');

const JobController = {
    getJobsByFlowId: async (req, res) => {
        try {
            const flow = await Flow.findById(req.params.flowId);
            if (!flow) {
                return res.status(404).json({ message: 'Flow not found' });
            }

            const jobs = await Job.find({ flow_id: flow._id })
                .populate({
                    path: 'template',
                    populate: { path: 'service', model: Service }
                })
                .populate({ path: 'data', model: Data })
                .populate({ path: 'dependencies', model: Job })
                .exec();

            res.json(jobs);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    getJobById: async (req, res) => {
        try {
            const job = await Job.findById(req.params.id)
                .populate({
                    path: 'template',
                    populate: { path: 'service', model: 'Service' }
                })
                .populate('data')
                .populate('dependencies');

            if (!job) {
                return res.status(404).json({ message: 'Job not found' });
            }

            res.json(job);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = JobController;
