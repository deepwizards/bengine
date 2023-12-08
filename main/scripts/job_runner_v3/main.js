const mongoose = require('mongoose');
const logger = require('./logger');
const { run } = require('./runner');

mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useNewUrlParser', true)
mongoose.set('useUnifiedTopology', true)

mongoose.connect(process.env.BENGINE_DB_URI || 'mongodb://localhost:27017/bengine')

mongoose.connection.on('error', (err) => {
	console.error(err)
	console.log('MongoDB connection error. Please make sure MongoDB is running.')
	process.exit()
})


async function main() {
    try {
        process.on('unhandledRejection', (error) => {
            logger.error('Unhandled Rejection:', error);
        });
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
        });
        await run();
        console.log('Job Run Complete');
        mongoose.connection.close();
        process.exit(0)
    } catch (error) {
        logger.error('Job Run Error:', error);
        process.exit(1)
    }
}

main();
