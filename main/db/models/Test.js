const mongoose = require('mongoose');
const Test = new mongoose.Schema({
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    template_version: String,
    result: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Test', Test);
