import { Worker, MessageChannel } from "worker_threads";
import { MAX_WORKERS, MAX_JOB_RETRIES } from "./config.js";

export class JobQueue {
    constructor(client) {
        this.client = client;
        this.activeWorkers = 0;
    }

    async addJob(job) {
        const jobId = Math.random().toString(36).substring(2);
        const jobData = { id: jobId, status: 'pending', retries: 0, ...job };
        await this.updateJobInRedis(jobId, jobData, true);
        this.processNextJob();
        return jobId;
    }

    async updateJobInRedis(jobId, jobData, isNew = false) {
        const multi = this.client.multi();
        multi.hset(jobId, "data", JSON.stringify(jobData));
        if (isNew) {
            multi.rpush("queue", jobId);
        }
        await multi.exec();
    }

    async processNextJob() {
        if (this.activeWorkers >= MAX_WORKERS) return;

        const jobId = await this.client.lpop("queue");
        if (!jobId) return;

        const jobData = await this.getJobData(jobId);
        if (!jobData) return;

        this.activeWorkers++;
        this.startWorker(jobId, jobData);
    }

    async getJobData(jobId) {
        try {
            const jobDataJSON = await this.client.hget(jobId, "data");
            return JSON.parse(jobDataJSON);
        } catch (error) {
            console.error("Error parsing job data:", error);
            return null;
        }
    }

    startWorker(jobId, jobData) {
        const { port1: mainPort, port2: workerPort } = new MessageChannel();
        const worker = new Worker('./worker.js');
        worker.postMessage({ job: jobData, port: workerPort }, [workerPort]);

        mainPort.on("message", async (response) => {
            await this.handleWorkerResponse(jobId, jobData, response);
        });

        worker.on("error", async (error) => {
            await this.handleWorkerError(jobId, jobData, error);
        });

        worker.on("exit", () => {
            console.log("Worker exited");
            this.activeWorkers--;
            this.processNextJob();
        });
    }

    async handleWorkerResponse(jobId, jobData, response) {
        jobData.status = response.status;
        await this.updateJobInRedis(jobId, jobData);

        if (response.status === 'completed') {
            await this.client.hset(jobId, "result", JSON.stringify(response.result));
        } else if (response.status === 'failed') {
            await this.retryOrMarkFailed(jobId, jobData, response.result);
        }
    }

    async handleWorkerError(jobId, jobData, error) {
        console.error("Worker error:", error);
        await this.retryOrMarkFailed(jobId, jobData, error.message);
    }

    async retryOrMarkFailed(jobId, jobData, errorMessage) {
        jobData.retries++;
        if (jobData.retries < MAX_JOB_RETRIES) {
            console.log(`Retrying job (${jobData.retries}/${MAX_JOB_RETRIES})...`);
            await this.updateJobInRedis(jobId, jobData);
        } else {
            console.log(`Job failed after ${MAX_JOB_RETRIES} attempts.`);
            await this.client.hset(jobId, "error", JSON.stringify({ message: errorMessage }));
        }
    }

    async initQueueFromRedis() {
        const queue = await this.client.lrange("queue", 0, -1);
        for (let jobId of queue) {
            const jobData = await this.getJobData(jobId);
            if (jobData && (jobData.status === 'pending' || (jobData.status === 'failed' && jobData.retries < MAX_JOB_RETRIES))) {
                this.processNextJob();
            }
        }
    }
}
