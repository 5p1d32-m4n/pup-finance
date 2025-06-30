require('dotenv').config();
const { auth } = require("express-oauth2-jwt-bearer");

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
    console.error('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE environment variables. Please check your .env file.')
    process.exit(1);
}

// Middleware to validate the Access Token (Authentication)
const jwtCheck = auth({
    audience: AUTH0_AUDIENCE,
    issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
});

// Custom middleware to check permissions (Authorization)
// This will expect the 'permissions' claim in the Access Token,
// typically namespaced like "https://your-api-identifier.com/permissions"
const checkPermissions = (requiredPermissions) => (req, res, next) => {
    // The decoded token payload is available on req.auth.payload after jwtCheck
    // Ensure the namespace matches what you configured in your Auth0 Action.
    // Using AUTH0_AUDIENCE here is a common and recommended practice if you
    // set the custom claim like `api.accessToken.setCustomClaim(event.api.identifier + '/permissions', userPermissions);`
    // If you used 'https://pupfinance.com/', adjust the namespace accordingly.
    const permissionsClaimName = `${AUTH0_AUDIENCE}/permissions`; // Adjust if my namespace changes CRITICAL
    const userPermissions = req.auth.payload[permissionsClaimName] || [];

    const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));

    if (hasPermission) {
        next();
    } else {
        res.status(403).json({ message: 'Foridden: Insufficient permissions' })
    }
};

// Custom middleware to check roles (Authorization)
// This will expect the 'roles' claim in the ID Token (if you put it there)
// or the Access Token (if you put it there, namespaced).
// For API authorization, permissions are generally preferred, but roles can be used.
// Make sure this namespace matches your Auth0 Action's `namespace` variable.
const checkRoles = (requiredRoles) => (req, res, next) => {
    // Using the namespace from your original rule example 'https://pupfinance.com/roles'
    const rolesClaimName = 'https://pupfinance.com/roles'; // Adjust if your namespace is different
    const userRoles = req.auth.payload[rolesClaimName] || [];

    const hasRole = requiredRoles.some(role =>
        userRoles.includes(role)
    );

    if (hasRole) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Insufficient roles' });
    }
};


// Error handling middleware for JWT validation failures
// This must be placed *after* any routes that use jwtCheck
const handleAuthErrors = (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        // Log the error for debugging
        console.error('Authentication Error:', err.message);
        return res.status(err.status).send({ message: err.message, error_code: err.code });
    }
    next(err); // Pass other errors to the next error handler
};


module.exports = {
    jwtCheck,
    checkPermissions,
    checkRoles,
    handleAuthErrors
};