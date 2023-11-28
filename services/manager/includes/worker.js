import { parentPort } from "worker_threads";
import { sendRequest } from "./utils.js";

parentPort.once("message", async ({ job, port }) => {
    const { api, api_port, endpoint, data } = job;
    
    const requestOptions = {
        url: `http://${api}:${api_port}${endpoint}`,
        data: data
    };

    try {
        const response = await sendRequest(requestOptions);
        port.postMessage({ status: 'completed', result: response.data });
    } catch (error) {
        port.postMessage({ status: 'failed', result: error.message });
    }
});
