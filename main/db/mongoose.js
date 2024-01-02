require('dotenv').config();
const mongoose = require('mongoose');
const isProduction = process.env.NODE_ENV === 'production';

const options = {
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
};

if (isProduction) {
    options.user = process.env.DB_USERNAME;
    options.pass = process.env.DB_PASSWORD;
    options.replicaSet = process.env.DB_REPLICA_SET;
}

async function connectDB() {
    const connectionString = process.env.BENGINE_DB_URI || 'mongodb://localhost:27017/bengine';

    try {
        await mongoose.connect(connectionString, options);
        console.log("Connected to MongoDB successfully.");
    } catch (err) {
        console.error("MongoDB connection error. Please make sure MongoDB is running.");
        console.error(err);
        process.exit(1);
    }
}

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected! Trying to reconnect...');
    setTimeout(connectDB, 5000);
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

async function checkDBConnection() {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Not connected to MongoDB');
    }
}

connectDB()
