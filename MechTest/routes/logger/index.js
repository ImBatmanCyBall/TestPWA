const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new DailyRotateFile({
            filename: 'error-%DATE%.log',
            dirname: 'logs', // Directory where log files will be stored
            datePattern: 'YYYY-MM-DD',
            maxSize: '5m', // Maximum file size of 5MB
            level: 'error',
            zippedArchive: true, // Optionally compress archived log files
            maxFiles: '14d' // Optionally keep logs for 14 days
        })
    ]
});

module.exports = logger;
