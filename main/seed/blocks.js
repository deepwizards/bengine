const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('./db.js');
const Block = require('../db/models/Block');

(async () => {
    try {
        const blocksDataPath = path.join(__dirname, 'data', 'blocks.json');
        const blocksData = fs.readFileSync(blocksDataPath, 'utf-8');
        const blocks = JSON.parse(blocksData);
        const blocksWithType = blocks.map(block => ({
            ...block,
            type: 'text',
        }));
        const insertedBlocks = await Block.insertMany(blocksWithType);
        console.log('Blocks seeded successfully:', insertedBlocks);
        mongoose.connection.close();
    } catch (error) {
        console.error('Failed to seed Blocks:', error);
    }
})();
