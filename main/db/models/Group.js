const mongoose = require('mongoose');
const Group = new mongoose.Schema({
    name: String,
    description: String,
    type: String,
    list: Array,
    alias: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Group', Group);
