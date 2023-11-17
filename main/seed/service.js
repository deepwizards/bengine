const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('./db.js');
const Service = require('../db/models/Service');

(async () => {
    try {
        const servicesDataPath = path.join(__dirname, 'data', 'services.json');
        const servicesData = fs.readFileSync(servicesDataPath, 'utf-8');
        const services = JSON.parse(servicesData);
        const insertedServices = await Service.insertMany(services);
        console.log('Services seeded successfully:', insertedServices);
        mongoose.connection.close();
    } catch (error) {
        console.error('Failed to seed services:', error);
    }
})();
