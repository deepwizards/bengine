const mongoose = require('mongoose');
const JobRun = new mongoose.Schema({
    jobs: [
        {
            job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
            status: String,
            queue_id: String, // redis job id
            output_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Output' },
        },
    ],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('JobRun', JobRun);
