const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('./db.js');
const Flow = require('../db/models/Flow');

(async () => {
    try {
        const flowsDataPath = path.join(__dirname, 'data', 'flows.json');
        const flowsData = fs.readFileSync(flowsDataPath, 'utf-8');
        const flows = JSON.parse(flowsData);
        const insertedFlows = await Flow.insertMany(flows);
        console.log('Flows seeded successfully:', insertedFlows);
        mongoose.connection.close();
    } catch (error) {
        console.error('Failed to seed Flows:', error);
    }
})();
