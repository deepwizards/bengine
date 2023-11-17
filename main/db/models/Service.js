const mongoose = require('mongoose');
const Service = new mongoose.Schema({
    name: String,
    description: String,
    api: String,
    port: Number,
    endpoint: String,
    icon: String,
    input_format: String,
    output_format: String,
    type: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Service', Service);
