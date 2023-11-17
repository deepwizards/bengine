import { parentPort } from "worker_threads";
import { sendRequest } from "./utils.js";

parentPort.once("message", async ({ job, port }) => {
    const { api, api_port, endpoint, data } = job;
    console.log('HEY')
    console.log(data)
    try {
        const options = {
            url: `http://${api}:${api_port}${endpoint}`,
            method: "post",
            headers: { "Content-Type": "application/json" }, // needs authentication + custom headers
            data: data
        };
        const response = await sendRequest(options);
        port.postMessage({ status: 'completed', result: response.data });
    } catch (error) {
        port.postMessage({ status: 'failed', result: error.message });
    }
});
