const mongoose = require('mongoose');
const Data = new mongoose.Schema({
    name: String,
    description: String,
    body: String,
    filename: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Data', Data);
