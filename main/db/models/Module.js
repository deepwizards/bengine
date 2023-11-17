const mongoose = require('mongoose');
const Module = new mongoose.Schema({
    name: String,
    description: String,
    api: String,
    endpoint: String,
    icon: String,
    meta: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Module', Module);
