const mongoose = require('mongoose');
const Output = new mongoose.Schema({
    name: String,
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    body: String,
    filename: String,
    type: String,
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Output', Output);
