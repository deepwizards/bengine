import Bottleneck from "bottleneck";

export const MAX_WORKERS = 5;
export const MAX_JOB_RETRIES = 3;
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000;
export const limiter = new Bottleneck({
    minTime: 100,
    maxConcurrent: 3,
    reservoir: 30,
    reservoirRefreshAmount: 30,
    reservoirRefreshInterval: 60 * 1000,
});
