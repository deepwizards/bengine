const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoleSchema = new Schema({
    name: { type: String, required: true, unique: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    parent_role: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

RoleSchema.method('inheritPermissions', async function () {
    if (!this.parent_role) return;

    const parentRole = await this.model('Role').findById(this.parent_role).populate('permissions');
    if (!parentRole) throw new Error('Parent role not found');

    const inheritedPermissions = parentRole.permissions.map(p => p._id);
    this.permissions = [...new Set([...this.permissions, ...inheritedPermissions])];
});

module.exports = mongoose.model('Role', RoleSchema);
