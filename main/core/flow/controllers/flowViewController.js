const moment = require('moment');

const Flow = require('../../../db/models/Flow.js');
const Job = require('../../../db/models/Job.js');
const Service = require('../../../db/models/Service.js');
const Output = require('../../../db/models/Output.js');
const Data = require('../../../db/models/Data.js');

const renderWithError = (res, message, statusCode = 500) => {
    res.status(statusCode).render('error', { message });
};

exports.showAllFlows = async (req, res) => {
    try {
        const flows = await Flow.find({});
        res.render('flow/views/index', { title: 'All Flows', flows });
    } catch (err) {
        renderWithError(res, 'Error fetching flows');
    }
};

exports.showCreateFlow = (req, res) => {
    res.render('flow/views/new', { title: 'Create Flow' });
};

exports.showFlowDetails = async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.id);
        if (!flow) {
            return renderWithError(res, 'Flow not found', 404);
        }

        const jobs = await Job.find({ flow_id: flow._id })
            .populate({ path: 'service_id', model: Service })
            .populate({ path: 'data', model: Data })
            .populate({ path: 'dependencies', model: Job });

        const outputs = await Job.find({ flow_id: flow._id, flow_output: true })
            .populate({ path: 'outputs', model: Output });

        const services = await Service.find({});
        const allData = await Data.find({});
        const allFlowDeps = await Flow.find({ _id: { $ne: flow._id } });
        const flowDeps = await Flow.find({ _id: flow._id }).populate('dependencies').exec();
        const data = [];
        const dependencies = [];
        jobs.forEach(job => {
            job.data.forEach(datum => {
                if (!data.find(d => d._id.equals(datum._id))) data.push(datum);
            });
            job.dependencies.forEach(dep => {
                if (!dependencies.find(d => d._id.equals(dep._id))) dependencies.push(dep);
            });
        });
        const allDeps = jobs; // All jobs in the current flow can be potential dependencies
        res.render('flow/views/single', {
            title: 'Flow',
            flow,
            jobs,
            services,
            moment,
            outputs,
            data,
            dependencies,
            allData,
            allDeps,
            flowDeps,
            allFlowDeps
        });

    } catch (err) {
        renderWithError(res, 'Error fetching flow details');
    }
};

exports.showEditFlow = async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.id);
        if (!flow) {
            return renderWithError(res, 'Flow not found', 404);
        }
        res.render('flow/views/edit', { title: 'Edit Flow', flow });
    } catch (err) {
        renderWithError(res, 'Error fetching flow for editing');
    }
};

module.exports = exports;
