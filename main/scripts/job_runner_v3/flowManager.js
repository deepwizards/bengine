const Flow = require('../../db/models/Flow');
const Job = require('../../db/models/Job');
const logger = require('./logger');

class FlowManager {
    loadActiveFlows = async () => {
        try {
            return await Flow.find({ status: 'active' });
        } catch (error) {
            logger.error('Error loading active Flows:', error);
            throw error;
        }
    }

    markFlowComplete = async (flow) => {
        try {
            if (!flow) {
                throw new Error('Flow not found.');
            }
            flow.status = 'complete';
            await flow.save();
        } catch (error) {
            logger.error('Cannot mark flow complete:', error);
            throw error;
        }
    }

    updateFlowStatus = async (flow_id) => {
        try {
            const jobs = await Job.find({ flow_id }).populate('outputs');
            const allJobsCompleted = jobs.every(job => job.status === 'complete');
            if (allJobsCompleted) {
                const flowOutputs = jobs
                    .filter(job => job.flow_output)
                    .flatMap(job => job.outputs.map(output => output._id));
                const flow = await Flow.findById(flow_id);
                await Flow.updateOne(
                    { _id: flow._id },
                    { status: 'complete', outputs: flowOutputs }
                );
                logger.info(`Flow ${flow_id} marked as complete`);
            }
        } catch (error) {
            logger.error(`Error updating Flow status for Flow ${flow_id}:`, error);
            throw error;
        }
    }
}

module.exports = new FlowManager();
