const {z} = require('zod');

const validate = (schema) => (req, rest, next) => {
    try {
        // Validate request body
        if (req.body && Object.keys(req.body).length > 0) { // Only try to parse if body exists
            req.body = schema.parse(req.body); // Overwrite req.body with validated and transformed data
        }
        next();
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                })),
            });
        }
        next(error); // Pass other errors
    } catch (error) {
        
    }
}

module.exports = validate;