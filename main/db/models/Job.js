const mongoose = require('mongoose');
const Job = new mongoose.Schema({
    name: String,
    status: String,
    flow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    data: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Data' }],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    outputs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Output' }],
    queue_id: String, // redis job id
    loop: { type: Boolean, default: false },
    loops: { type: Number, default: 0 },
    loop_counter: { type: Number, default: 0 },
    loop_array: Array,
    flow_output: {
        type: Boolean,
        default: false,
    },
    project_output: {
        type: Boolean,
        default: false,
    },
    notes: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

Job.pre('save', function(next) {
    if (!this.outputs) {
        this.outputs = [];
    }
    next();
});

Job.methods.markComplete = function(output_id) {
    this.status = 'complete';
    this.outputs.push(output_id);
    return this.save();
}

Job.methods.addOutput = function(output_id) {
    if (!this.outputs) {
        this.outputs = [];
    }
    this.outputs.push(output_d);
    return this.save();
}

Job.methods.toJSON = function() {
    const job = this.toObject();
    return job;
}

module.exports = mongoose.model('Job', Job);
