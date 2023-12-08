const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;
const User = new Schema({
	username: { type: String, required: true, unique: true },
	email: { type: String, required: false, unique: true },
	role: { type: String, enum: ['operator', 'admin'], required: true },
	password: { type: String, required: true },
	status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
	bio: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

User.pre('save', async function (next) {
	if (this.isModified('password')) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

User.methods.comparePassword = function (password) {
	return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', User);
