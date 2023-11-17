const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const Flow = require('../../db/models/Flow');
const Job = require('../../db/models/Job');
const Data = require('../../db/models/Data');
const Block = require('../../db/models/Block');

const flowSeed = require('./flow.json');
const jobSeed = require('./job.json');
const dataSeed = require('./data.json');
const blockSeed = require('./block.json');

async function seedDatabase() {
    try {
        await mongoose.connect('mongodb://localhost:27017/bengine', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Populate seed data with generated ObjectIds
        const flowId = new ObjectId();
        const jobId = new ObjectId();
        const dataId = new ObjectId();
        const blockId = new ObjectId();

        flowSeed[0]._id = flowId;

        jobSeed[0]._id = jobId;
        jobSeed[0].flow_id = flowId;
        jobSeed[0].data = [dataId];

        dataSeed[0]._id = dataId;

        blockSeed[0]._id = blockId;
        // Add Block Type ID if needed
e
        await Flow.insertMany(flowSeed);
        await Job.insertMany(jobSeed);
        await Data.insertMany(dataSeed);
        await Block.insertMany(blockSeed);

        console.log('Database seeding completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during database seeding:', error);
        process.exit(1);
    }
}

seedDatabase();
