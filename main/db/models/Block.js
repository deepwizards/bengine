const mongoose = require('mongoose');
const Block = new mongoose.Schema({
    name: String,
    body: String,
    type: String,
    tags: [String]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Block', Block);
