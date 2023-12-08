const mongoose = require('mongoose');
const User = require('../db/models/User');

(async () => {
    try {
        const admin = new User({
            username: 'admin',
            password: 'ant555',
            role: 'admin',
        });
        await admin.save();
        console.log('Users seeded successfully');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding users:', error);
    }
})();
