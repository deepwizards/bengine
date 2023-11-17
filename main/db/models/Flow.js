const mongoose = require('mongoose');
const Job = require('./Job'); 
const Flow = new mongoose.Schema({
    name: String,
    description: String,
    status: String,
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    data: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Data' }],
    jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flow' }],
    outputs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Output' }],
    loop: { type: Boolean, default: false },
    loops: { type: Number, default: 0 },
    loop_counter: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

FlowSchema.methods.replaceData = async function(oldId, newId) {
    try {
        const jobs = await Job.find({ _id: { $in: this.jobs } });
        const promises = jobs.map(job => {
            job.data = job.data.map(id => id.toString() === oldId.toString() ? newId : id);
            return job.save();
        });
        await Promise.all(promises);
        return this;
    } catch (err) {
        console.error(err);
        throw new Error('An error occurred while replacing data');
    }
};

FlowSchema.methods.replaceDependencies = async function(oldId, newId) {
    try {
        const jobs = await Job.find({ _id: { $in: this.jobs } });
        const promises = jobs.map(job => {
            job.dependencies = job.dependencies.map(id => id.toString() === oldId.toString() ? newId : id);
            return job.save();
        });
        await Promise.all(promises);
        return this;
    } catch (err) {
        console.error(err);
        throw new Error('An error occurred while replacing dependencies');
    }
};

FlowSchema.methods.duplicateFlow = async function() {
    try {
        const flowData = this.toObject();
        delete flowData._id;
        delete flowData.created_at;
        delete flowData.updated_at;
        const newFlow = new Flow(flowData);
        newFlow.status = 'inactive';
        const oldJobs = await Job.find({ _id: { $in: this.jobs } });
        const newJobs = await Promise.all(oldJobs.map(async oldJob => {
            const oldJobData = oldJob.toObject();
            delete oldJobData._id;
            delete oldJobData.created_at;
            delete oldJobData.updated_at;
            const newJob = new Job(oldJobData);
            newJob.flow_id = newFlow._id;
            await newJob.save();
            return newJob._id;
        }));
        newFlow.jobs = newJobs;
        await newFlow.save();
        return newFlow;
    } catch (err) {
        console.error(err);
        throw new Error('An error occurred while duplicating the flow');
    }
};

module.exports = mongoose.model('Flow', Flow);
