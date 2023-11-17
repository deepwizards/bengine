import { Worker, MessageChannel } from "worker_threads";
import { MAX_WORKERS, MAX_JOB_RETRIES } from "./config.js";

export class JobQueue {
    constructor(client) {
        this.client = client;
        this.activeWorkers = 0;
        this.queue = [];
    }
    async addJob(job) {
        try {
            const jobId = Math.random().toString(36).substring(2);
            const jobData = { id: jobId, status: 'pending', retries: 0, ...job };
            await this.client.multi()
                .hset(jobId, "data", JSON.stringify(jobData))
                .rpush("queue", jobId)
                .exec();
            this.processNextJob();
            return jobId;
        } catch (error) {
            console.error("Redis error while adding job:", error);
            throw error;
        }
    }
    async processNextJob() {
        if (this.activeWorkers >= MAX_WORKERS) {
            return;
        }
        try {
            const jobId = await this.client.lpop("queue");
            if (jobId) {
                let jobData;
                try {
                    jobData = JSON.parse(await this.client.hget(jobId, "data"));
                } catch (error) {
                    console.error("Error parsing job data:", error);
                    throw error;
                }
                this.activeWorkers++;
                const { port1: mainPort, port2: workerPort } = new MessageChannel();
                const worker = new Worker('./worker.js');
                worker.postMessage({ job: jobData, port: workerPort }, [workerPort]);
                mainPort.on("message", async (response) => {
                    console.log("Received result from worker:", jobId, response.result);
                    jobData.status = response.status;
                    await this.client.hset(jobId, "data", JSON.stringify(jobData));
                    if (response.status === 'completed') {
                        await this.client.hset(jobId, "result", JSON.stringify(response.result));
                    } else if (response.status === 'failed') {
                        jobData.retries++;
                        if (jobData.retries < MAX_JOB_RETRIES) {
                            console.log(`Retrying job (${jobData.retries}/${MAX_JOB_RETRIES})...`);
                            await this.client.multi()
                                .hset(jobId, "data", JSON.stringify(jobData))
                                .rpush("queue", jobId) // re-enqueue job
                                .exec();
                        } else {
                            console.log(`Job failed after ${MAX_JOB_RETRIES} attempts.`);
                            await this.client.hset(jobId, "error", JSON.stringify(response.result));
                        }
                    }
                    this.activeWorkers--;
                    this.processNextJob();
                });
                worker.on("error", async (error) => {
                    console.error("Worker error:", error);
                    jobData.status = 'failed';
                    jobData.retries++;
                    if (jobData.retries < MAX_JOB_RETRIES) {
                        console.log(`Retrying job (${jobData.retries}/${MAX_JOB_RETRIES})...`);
                        await this.client.multi()
                            .hset(jobId, "data", JSON.stringify(jobData))
                            .rpush("queue", jobId) // re-enqueue job
                            .exec();
                    } else {
                        console.log(`Job failed after ${MAX_JOB_RETRIES} attempts.`);
                    }
                    this.activeWorkers--;
                    this.processNextJob();
                });
                worker.on("exit", () => {
                    console.log("Worker exited");
                });
            }
        } catch (error) {
            console.error("Redis error while processing job:", error);
        }
    }
    async initQueueFromRedis() {
        try {
            const queue = await this.client.lrange("queue", 0, -1);
            for (let jobId of queue) {
                try {
                    const jobData = JSON.parse(await this.client.hget(jobId, "data"));
                    if (jobData.status === 'pending' || (jobData.status === 'failed' && jobData.retries < MAX_JOB_RETRIES)) {
                        this.queue.push(jobData);
                    }
                } catch (error) {
                    console.error("Error parsing job data:", error);
                }
            }
            this.processNextJob();
        } catch (error) {
            console.error("Redis error while initializing queue:", error);
        }
    }
}
