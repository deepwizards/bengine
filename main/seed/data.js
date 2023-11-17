const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('./db.js');
const Data = require('../db/models/Data');

(async () => {
    try {
        const dataFilesPath = path.join(__dirname, 'data', 'data.json');
        const dataFilesData = fs.readFileSync(dataFilesPath, 'utf-8');
        const dataFiles = JSON.parse(dataFilesData);
        const dataToInsert = dataFiles.map((dataFile) => {
            const filePath = path.join(__dirname, 'data', 'files', dataFile.filename);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return {
                name: dataFile.name,
                description: dataFile.description,
                body: fileContent
            };
        });
        const insertedData = await Data.insertMany(dataToInsert);
        console.log('Data seeded successfully:', insertedData);
        mongoose.connection.close();
    } catch (error) {
        console.error('Failed to seed data:', error);
    }
})();
