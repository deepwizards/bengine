const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, json, printf, colorize } = format;

const consoleFormat = printf(({ level, message }) => {
  return `${level}: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'job-runner-v3' },
  transports: [
    new transports.File({ 
      filename: 'logs/runner_logs.log',
      format: combine(
        timestamp(),
        json()
      ),
    }),
    new transports.Console({
      level: 'error',
      format: combine(
        colorize(),
        consoleFormat
      ),
    }),
  ],
});

module.exports = logger;

