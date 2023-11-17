const mongoose = require('mongoose');
require('./db.js');
const User = require('../db/models/User');

(async () => {
    try {
        const admin = new User({
            username: 'admin',
            password: 'ant555',
            role: 'admin',
        });
        const operator = new User({
            username: 'operator',
            password: 'ant555',
            role: 'operator',
        });
        await User.deleteMany({});
        await admin.save();
        await operator.save();
        console.log('Users seeded successfully');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding users:', error);
    }
})();
