const Job = require('../../db/models/Job');
const Output = require('../../db/models/Output');
const Service = require('../../db/models/Service');
const Template = require('../../db/models/Template');
const { buildRequestBody } = require('./blockManager');
const { requestJob, checkJobStatus } = require('./apiService');
const logger = require('./logger');

class JobManager {
    loadPendingJobs = async () => {
        try {
            return await Job.find({ status: 'pending' });
        } catch (error) {
            logger.error('Error loading pending jobs:', error);
            throw error;
        }
    }

    markJobComplete = async (job, outputId) => {
        try {
            if (!job) {
                throw new Error('Job not found.');
            }
            job.status = 'complete';
            job.outputs = job.outputs || [];
            job.outputs.push(outputId);
            await job.save();
        } catch (error) {
            logger.error('Error marking job complete:', error);
            throw error;
        }
    }

    markJobBlocked = async (job) => {
        try {
            if (!job) {
                throw new Error('Job not found.');
            }
            job.status = 'blocked';
            await job.save();
        } catch (error) {
            logger.error('Error marking job as blocked:', error);
            throw error;
        }
    }

    reactivateBlockedJobs = async () => {
        try {
            const blockedJobs = await Job.find({ status: 'blocked' });
            for (const job of blockedJobs) {
                const elapsedTime = (new Date().getTime() - job.updated_at.getTime()) / 60000;
                if (elapsedTime > 10) {
                    const updateFields = { status: 'open', queue_id: null };
                    if (job.loop && job.loop_counter < job.loops) {
                        updateFields.loop_counter = job.loop_counter + 1;
                    }
                    await Job.updateOne({ _id: job._id }, updateFields);
                }
            }
        } catch (error) {
            logger.error('Error reactivating blocked jobs:', error);
            throw error;
        }
    }

    updateJobRunStatus = (jobRun, job) => {
        jobRun.jobs = jobRun.jobs || [];
        const jobRunEntry = jobRun.jobs.find(entry => entry.job_id.equals(job._id));
        if (jobRunEntry) {
            jobRunEntry.status = job.status;
            if (job.loop) {
                jobRunEntry.loop_counter = job.loop_counter;
            }
        }
    }

    handleCompletedJob = async (job, result, jobRun) => {
        // Create output and save it
        const output = new Output({
            job_id: job._id,
            body: JSON.stringify(result.result.result),
        });
        await output.save();

        // Handle loop logic
        if (job.loop && job.loop_counter < job.loops) {
            job.loop_counter++;
            job.status = 'open';
        } else {
            await this.markJobComplete(job, output._id);
        }

        await job.save();
        job = await Job.findById(job._id);

        // Update job run status
        this.updateJobRunStatus(jobRun, job);
    }

    handleFailedJob = async (job, result, jobRun) => {
        // Handle loop logic on failure
        if (job.loop && job.loop_counter < job.loops) {
            if (job.loop_counter > 0) {
                job.loop_counter--;
            }
            await this.markJobBlocked(job);
        } else {
            await Job.updateOne({ _id: job._id }, { status: 'failed' });
        }
        await job.save();
        job = await Job.findById(job._id);

        logger.error(`Job ${job._id} failed: ${result.error}`);

        // Update job run status
        this.updateJobRunStatus(jobRun, job);
    }

    processPendingJobs = async (jobRun) => {
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pendingJobs = await this.loadPendingJobs();
            for (const job of pendingJobs) {
                const updatedJob = await Job.findById(job._id); // Use a different variable
                const result = await checkJobStatus(updatedJob.queue_id);
                if (result !== null) {
                    if (result.status === 'completed') {
                        // Handling completed jobs with loop logic
                        this.handleCompletedJob(updatedJob, result, jobRun);
                    } else if (result.status === 'failed') {
                        // Handling failed jobs
                        this.handleFailedJob(updatedJob, result, jobRun);
                    }
                }
            }
            await jobRun.save();
        } catch (error) {
            logger.error('Error processing pending jobs:', error);
            throw error;
        }
    }
    

    checkDependencies = async (job) => {
        try {
            const dependencies = await Job.find({ _id: { $in: job.dependencies } }).lean();
            return dependencies.every(dependency => dependency.status === 'complete');
        } catch (error) {
            logger.error(`Error checking dependencies for job ${job._id}:`, error);
            throw error;
        }
    }

    getOutputBodies = async (job) => {
        const depJobs = await Job.find({
            _id: { $in: job.dependencies },
            status: "complete",
            outputs: { $ne: [] }
        })
        .populate("outputs")
        .lean();
        const outputBodies = depJobs.flatMap(depJob => {
            return depJob.outputs.map(output => output.body);
        });
        return outputBodies;
    }

    determineJobStatusUpdate = (job, result) => {
        let updateData = { status: 'pending', queue_id: result.jobId };

        if (result.outputId) {
            this.markJobComplete(job, result.outputId);
            if (job.loop === true && job.loop_counter < job.loops) {
                updateData.status = 'looping';
                updateData.loop_counter = job.loop_counter + 1;
            }
        } else if (job.loop === true && job.loop_counter < job.loops) {
            updateData.status = 'looping';
            updateData.loop_counter = job.loop_counter + 1;
        }

        return updateData;
    }

    startJob = async (job) => {
        if (!job) {
            logger.error('Invalid job provided to startJob');
            return null;
        }
        try {
            if (!job.dependencies.length || (await this.checkDependencies(job))) {
                const service = await Service.findById(job.template.service);
                if (!service) {
                    logger.error(`Service not found for job ${job._id}`);
                    return null;
                }
                const requestBody = await buildRequestBody(job);
                const result = await requestJob(service, requestBody);
                if (result && result.jobId) {

                    let updateData = this.determineJobStatusUpdate(job, result);
                    await Job.updateOne({ _id: job._id }, updateData);
                    return { status: updateData.status, queue_id: result.jobId };
                    // console.log('hereerererer')
                    // let updateData = { status: 'pending', queue_id: result.jobId };
                    // if (result.outputId) {
                    //     await this.markJobComplete(job, result.outputId);
                    //     if (job.loop == true && job.loop_counter < job.loops) {
                    //         updateData.status = 'looping';
                    //         updateData.loop_counter = job.loop_counter + 1;
                    //     }
                    // }
                    // await Job.updateOne({ _id: job._id }, updateData);
                    // return { status: updateData.status, queue_id: result.jobId };
                } else {
                    logger.error(`Invalid ObjectId for job ${job._id}:`, result ? result.jobId : 'no result');
                    if (result === null) {
                        return { status: 'pending', queue_id: job.queue_id };
                    }
                    if (job.loop === true && job.loop_counter < job.loops) {
                        await Job.updateOne({ _id: job._id }, { status: 'looping', loop_counter: job.loop_counter + 1 });
                        job.status = 'looping';
                        job.loop_counter++;
                        return { status: 'looping', queue_id: null };
                    }
                    await Job.updateOne({ _id: job._id }, { status: 'blocked' });
                    return { status: 'blocked', queue_id: null };
                }
            } else {
                logger.info(`Job ${job._id} has unmet dependencies`);
                setTimeout(() => startJob(job), 5000);
                return null;
            }
        } catch (error) {
            logger.error(`Error starting job ${job._id}:`, error);
            return null;
        }
    }
}

module.exports = new JobManager();
