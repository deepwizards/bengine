const mongoose = require('mongoose');
const Flow = require('./Flow');
const Project = new mongoose.Schema({
    name: String,
    description: String,
    status: String,
    flows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flow' }],
    outputs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Output' }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

Project.methods.replaceData = async function(oldId, newId) {
    try {
        const flows = await Flow.find({ _id: { $in: this.flows } });
        const promises = flows.map(flow => {
            flow.data = flow.data.map(id => id.toString() === oldId.toString() ? newId : id);
            return flow.save();
        });
        await Promise.all(promises);
        return this;
    } catch (err) {
        console.error(err);
        throw new Error('An error occurred while replacing data');
    }
};

Project.methods.replaceDependencies = async function(oldId, newId) {
    try {
        const flows = await Flow.find({ _id: { $in: this.flows } });
        const promises = flows.map(flow => {
            flow.dependencies = flow.dependencies.map(id => id.toString() === oldId.toString() ? newId : id);
            return flow.save();
        });
        await Promise.all(promises);
        return this;
    } catch (err) {
        console.error(err);
        throw new Error('An error occurred while replacing dependencies');
    }
};

Project.methods.duplicateProject = async function() {
    try {
        const projectData = this.toObject();
        delete projectData._id;
        delete projectData.created_at;
        delete projectData.updated_at;
        const newProject = new Project(projectData);
        newProject.status = 'inactive';
        const oldFlows = await Flow.find({ _id: { $in: this.flows } });
        const newFlows = await Promise.all(oldFlows.map(async oldFlow => {
            const oldFlowData = oldFlow.toObject();
            delete oldFlowData._id;
            delete oldFlowData.created_at;
            delete oldFlowData.updated_at;
            const newFlow = new Flow(oldFlowData);
            newFlow.project_id = newProject._id;
            await newFlow.save();
            return newFlow._id;
        }));
        newProject.flows = newFlows;
        await newProject.save();
        return newProject;
    } catch (err) {
        console.error(err);
        throw new Error('An error occurred while duplicating the project');
    }
};

module.exports = mongoose.model('Project', Project);
