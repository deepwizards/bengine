import axios from "axios";
import { limiter, MAX_RETRIES, RETRY_DELAY } from "./config.js";

export const sendRequest = async (options) => {
    let retries = 0;
    const makeRequest = async () => {
        console.log('her1')
        console.log(options)
        try {
            console.log('lets try')
            return await limiter.schedule(() => axios.post(options.url, { data: options.data }));
        } catch (error) {
            console.log(error)
            retries++;
            if (retries < MAX_RETRIES) {
                console.log(`Retrying (${retries}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return makeRequest();
            } else {
                throw new Error("Max retries reached");
            }
        }
    };
    return await makeRequest();
};
