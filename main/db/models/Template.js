const mongoose = require('mongoose');
const VersionSchema = new mongoose.Schema({
    blocks: [{
        block: {
            type: Schema.Types.ObjectId,
            ref: 'Block'
        },
        order: Number
    }],
    created_at: {
        type: Date,
        default: Date.now
    }
});

const Template = new mongoose.Schema({
    name: String,
    description: String,
    notes: String,
    inputs: [{
        block: {
            type: Schema.Types.ObjectId,
            ref: 'Block'
        },
        order: {
            type: Number,
        }
    }],
    outputs: [{
        type: Schema.Types.ObjectId,
        ref: 'Block'
    }],
    status: {
        type: String
    },
    service: { type: Schema.Types.ObjectId, ref: 'Service'},
    versions: [VersionSchema],
    current_version: {
        type: Schema.Types.ObjectId,
        ref: 'VersionSchema'
    },
    is_locked: {
        type: Boolean,
        default: false
    }

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

Template.methods.addVersion = function(blocks) {
    const newVersion = { blocks };
    this.versions.push(newVersion);
    this.current_version = newVersion._id;
    return newVersion;
};

module.exports = mongoose.model('Template', Template);
