const logger = require('../logger'),
    util = require('util');

const handleAppError = (error, res) => {

    logError(error);
    
    res.status(error.statusCode).json({
        status: error.status,
        message: error.message
    });
};

const logError = (err) => {

    if (typeof err === 'object') {
        err = util.inspect(err);
    }

    logger.error(`ERROR 💥: ${err}`);

};


const errorHandler = (err, req, res, next) => {
    // Use a cloned version of the error to avoid modifying the original err object
    let error = { ...err };
    error.message = err.message;

    if (error.isOperational) {
        handleAppError(error, res);
    } else {
        // Handle unexpected errors
        logError(error);
        res.status(500).json({
            status: 'error',
            message: 'An unexpected error occurred!'
        });
    }
};

module.exports = errorHandler;
