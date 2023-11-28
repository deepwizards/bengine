import axios from "axios";
import { limiter, MAX_RETRIES, RETRY_DELAY } from "./config.js";

export const sendRequest = async (options) => {
    let retries = 0;

    async function attemptRequest() {
        try {
            return await limiter.schedule(() => axios.post(options.url, options.data));
        } catch (error) {
            if (++retries < MAX_RETRIES) {
                console.log(`Retrying (${retries}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return attemptRequest();
            } else {
                throw new Error("Max retries reached");
            }
        }
    }

    return attemptRequest();
};
