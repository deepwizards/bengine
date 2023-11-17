const Block = require('../../db/models/Block');
const Data = require('../../db/models/Data');
const Output = require('../../db/models/Output');

const fetchBlocks = async (ids) => {
    let results = [];
    for (b of ids) {
        let block = await Block.findById({_id: b.block});
        results.push(block);
    }
    return results;
};

const processBlocks = async (blocks) => {
    let result = "";
    for (const block of blocks) {
        let blockData;
        switch (block.type.toString()) {
            case 'data':
                blockData = await Data.findById(block.data);
                result+=blockData.body;
                break;
            case 'dependency':
                blockData = await Output.findById(block.data);
                result+=blockData.body;
                break;
            case 'text':
                result+=block.body;
                break;
        }
    }
    return result;
};

const buildRequestBody = async (job) => {
    if (!job) {
        throw new Error('Invalid job provided to buildRequestBody');
    }
    let body = {
        api: job.template.service.api,
        api_port: job.template.service.port,
        endpoint: job.template.service.endpoint
    };
    const blocks = await fetchBlocks(job.template.inputs);
    const processedData = await processBlocks(blocks);
    body.data = processedData.toString();
    return body;
};

module.exports = {
    fetchBlocks,
    processBlocks,
    buildRequestBody
};
