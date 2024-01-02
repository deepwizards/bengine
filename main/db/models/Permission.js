const mongoose = require('mongoose');
const { Schema } = mongoose;

const PermissionSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    is_deleted: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Permission', PermissionSchema);
