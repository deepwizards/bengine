const axios = require('axios');
const logger = require('./logger');
const API_BASE_URL = `http://localhost:3000`;

async function requestJob(service, body) {
    try {
        const response = await axios.post(`${API_BASE_URL}/submitJob`, body);
        return response.data;
    } catch (error) {
        logger.error('Error requesting job:', error);
        throw error;
    }
}

async function checkJobStatus(jobId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/jobStatus/${jobId}`);
        return response.data;
    } catch (error) {
        logger.error('Error checking job status:', error);
        throw error;
    }
}

module.exports = { requestJob, checkJobStatus };
