const logger = require('../../logger'),
    util = require('util'),
    ValidationError = require('../validation');

const commonErrorHandler = (handler) => {

    return async (req, res, next) => {

        try { 

            await handler(req, res, next);

        } catch (error) {

            //console.error(error);

            if (typeof error === 'object') {
                error = util.inspect(error);
            }

            logger.error(`ERROR 💥: ${error}`);

            // Handle specific error types or messages
            if (error instanceof TypeError) {
                
                return res.status(400).json({
                    status: 'fail',
                    message: 'Type error occurred'
                });

            }

            if (error instanceof RangeError) {
                
                return res.status(400).json({
                    status: 'fail',
                    message: 'Value out of range: ' + error.message
                });

            }

            if (error instanceof ReferenceError) {
                
                return res.status(400).json({
                    status: 'fail',
                    message: 'Reference error: ' + error.message
                });

            }

            if (error instanceof SyntaxError) {
                
                return res.status(400).json({
                    status: 'fail',
                    message: 'Syntax error in provided input: ' + error.message
                });

            }

            if (error instanceof URIError) {
                
                return res.status(400).json({
                    status: 'fail',
                    message: 'URI function used incorrectly: ' + error.message
                });

            }

            // You can add custom errors like a ValidationError
            if (error instanceof ValidationError) {

                return res.status(400).json({
                    status: 'fail',
                    message: 'Validation failed: ' + error.message
                });

            }

            if (error.message === 'Not Authorized') {
                
                return res.status(401).json({
                    status: 'fail',
                    message: 'Not Authorized'
                });

            }

            if (error.message === 'Resource Not Found') {
                
                return res.status(404).json({
                    status: 'fail',
                    message: 'Resource Not Found'
                });

            }

            if (error.message === 'Too Many Requests') {
                
                return res.status(429).json({
                    status: 'fail',
                    message: 'Too Many Requests'
                });
                
            }

            // ... other specific error handlers ...

            // Handle other general errors
            return res.status(500).json({
                status: 'error',
                message: 'Internal Server Error'
            });

        }

    };

};


module.exports = commonErrorHandler;
