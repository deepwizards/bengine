const Job = require('../../db/models/Job');
const Flow = require('../../db/models/Flow');
const Template = require('../../db/models/Template');
const Service = require('../../db/models/Service');
const JobRun = require('../../db/models/Log');
const { startJob, processPendingJobs, reactivateBlockedJobs } = require('./jobManager');
const { updateFlowStatus, loadActiveFlows } = require('./flowManager');
const logger = require('./logger');

async function checkLoopCondition(entity) {
    if ((entity.loop === false) || typeof entity.loop_counter !== 'number' || typeof entity.loops !== 'number') {
        return false;
    }
    if (entity.loop_counter >= entity.loops) {
        console.log(entity.loop, entity.loop_counter, entity.loops);
        return false;
    }
    return true;
}

exports.run = async function runTasks() {
    try {
        const activeFlows = await loadActiveFlows();
        const jobRun = new JobRun();
        for (const flow of activeFlows) {
            if (!checkLoopCondition(flow)) {
                continue;
            }
            const jobs = await Job.find({
                flow_id: flow._id,
                $or: [
                    { status: 'open' },
                    { status: 'looping' },
                    { status: 'blocked', loop: true }
                ]
            }).populate({
                path: 'template',
                populate: {
                    path: 'service',
                    model: 'Service'
                }
            });

            for (const job of jobs) {
                // Check if job should continue looping
                if (job.loop && job.loop_counter < job.loops) {
                    const result = await startJob(job);
                    if (result) {
                        await Job.updateOne({ _id: job._id }, { status: 'looping', loop_counter: job.loop_counter + 1 });
                        jobRun.jobs.push({
                            job_id: job._id,
                            status: 'looping',
                            queue_id: result.jobId,
                        });
                    }
                } else if (job.status === 'open' && !job.loop) {
                    // Handle non-looping jobs that are open
                    const result = await startJob(job);
                    if (result) {
                        await Job.updateOne({ _id: job._id }, { status: 'pending' });
                        jobRun.jobs.push({
                            job_id: job._id,
                            status: 'pending',
                            queue_id: result.jobId,
                        });
                    }
                } else {
                    // For jobs that are neither open nor need to loop
                    await Job.updateOne({ _id: job._id }, { status: 'complete' });
                }
            }

            // Updating flow status
            if (checkLoopCondition(flow)) {
                await Flow.updateOne({ _id: flow._id }, { status: 'active', loop_counter: flow.loop_counter + 1 });
            } else {
                await updateFlowStatus(flow._id);
            }

            await reactivateBlockedJobs();
            await processPendingJobs(jobRun);
        }
        await jobRun.save();
    } catch (error) {
        logger.error('Error running tasks:', error);
        throw error;
    }
};
