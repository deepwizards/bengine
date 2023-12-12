import express from "express";
import Redis from "ioredis";
import { isMainThread } from "worker_threads";
import { JobQueue } from "./includes/jobQueue.js";

const app = express();
app.use(express.json());

const redisClient = new Redis('redis://bengine-redis:6379');

redisClient.on("connect", () => {
    console.log("Connected to Redis");
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

async function handleJobSubmission(req, res) {
    try {
        const jobId = await jobQueue.addJob(req.body);
        res.json({ jobId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function handleJobStatusRequest(req, res) {
    const jobId = req.params.jobId;
    const jobDataJSON = await redisClient.hget(jobId, "data");

    if (!jobDataJSON) {
        return res.status(404).json({ message: "Job not found" });
    }

    const jobData = JSON.parse(jobDataJSON);
    const response = { status: jobData.status };

    if (jobData.status === 'completed') {
        const resultJSON = await redisClient.hget(jobId, "result");
        response.result = resultJSON ? JSON.parse(resultJSON) : null;
    } else if (jobData.status === 'failed') {
        const errorJSON = await redisClient.hget(jobId, "error");
        response.error = errorJSON ? JSON.parse(errorJSON) : null;
    }

    res.json(response);
}

function sendServiceStatus(req, res) {
    res.status(200).json({
        status: 'OK',
        message: 'Service Manager API is running'
    });
}

if (isMainThread) {
    const jobQueue = new JobQueue(redisClient);

    app.post("/submitJob", handleJobSubmission);
    app.get("/jobStatus/:jobId", handleJobStatusRequest);
    app.get('/status', sendServiceStatus);

    app.listen(3000, () => {
        console.log("Server listening on port 3000");
    });

    jobQueue.initQueueFromRedis();
}
