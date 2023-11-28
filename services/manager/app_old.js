import express from "express";
import bodyParser from "body-parser";
import Redis from "ioredis";
import { isMainThread } from "worker_threads";
import { JobQueue } from "./jobQueue.js";
const app = express();
app.use(express.json());
app.use(bodyParser.json());
const client = new Redis('redis://redis:6379');
client.on("connect", function () {
    console.log("Connected to Redis");
});
client.on("error", function (error) {
    console.error("Redis error:", error);
});
if (isMainThread) {
    const jobQueue = new JobQueue(client);
    const app = express();
    app.use(express.json());
    app.post("/submitJob", async (req, res) => {
        try {
            const jobId = await jobQueue.addJob({ api: req.body.api, api_port: req.body.api_port, endpoint: req.body.endpoint, data: req.body.data });
            res.json({ jobId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    app.get("/jobStatus/:jobId", async (req, res) => {
        const jobId = req.params.jobId;
        const jobDataJSON = await client.hget(jobId, "data");
        if (!jobDataJSON) {
            res.status(404).json({ message: "Job not found" });
        } else {
            const jobData = JSON.parse(jobDataJSON);
            let response = {
                status: jobData.status
            };
            if (jobData.status === 'completed') {
                const resultJSON = await client.hget(jobId, "result");
                const result = resultJSON ? JSON.parse(resultJSON) : null;
                response.result = result;
            } else if (jobData.status === 'failed') {
                const errorJSON = await client.hget(jobId, "error");
                const error = errorJSON ? JSON.parse(errorJSON) : null;
                response.error = error;
            }
            res.json(response);
        }
    });
    app.get('/status', (req, res) => {
        res.status(200).send({
            status: 'OK',
            message: 'Service Manager API is running'
        })
    });
    app.listen(3000, () => {
        console.log("Server listening on port 3000");
    });
    jobQueue.initQueueFromRedis();
}
