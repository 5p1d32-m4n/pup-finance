const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { jwtCheck, checkPermissions, checkRoles, handleAuthErrors } = require('./middleware/authMiddleware');
const auditLogMiddleware = require('./middleware/auditLogMiddleware');
const prisma = require('./config/prisma');
const app = express();

// --- Core security middleware ---
app.use(helmet()); // setting http headers for security
app.use(hpp()); // protection against http param polution attacks (initially in 2009 resurge in 2021).

// --- Rate limiting (done before other middleware that would consume resources.)
// Defining rate limits for general API access
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins. TODO: make the '15' an env var and change the message to reflect limit.
    max: 100, // Limit each ip to 100 requests per windowMs.
    message: `Too many requests from this IP, please try again after ${15} minutes.`
});

// Applying the limiter
app.use('/api/', apiLimiter);

// Middleware to parse JSON request bodies
app.use(express.json());

// --- Global Authentication Middleware ---
// Apply jwtCheck to all routes *after* this point.
// Any route defined BEFORE this line will be public.
// Any route defined AFTER this line will require a valid JWT.
app.use(jwtCheck);

// --- Audit Logging Middleware (After auth, but before routing)
app.use(auditLogMiddleware);

// --- Public Route Example (No JWT required if placed before app.use(jwtCheck)) ---
// To make a route public when app.use(jwtCheck) is global, you'd define it *before* that line.
// For example:
// app.get('/public-info', (req, res) => {
//   res.send('This is public information.');
// });

// Routes requiring a valid JWT (because app.use(jwtCheck) is applied globally)
app.get('/', (req, res) => {
    // If you reach here, the token is valid!
    res.send('Hello, Pup-Finance! Your token is valid.');
});

// Example route to test the database connection (now also protected by JWT)
app.get('/test-db', async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT NOW()`;
        res.status(200).json({ message: 'Database connection successful with Prisma!', timestamp: result[0].now });
    } catch (err) {
        console.error('Database query error:', err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Protected Routes with Specific Permissions ---
// TODO: Move these to routes.

// Example: Get user's account balance - requires 'read:accounts' permission
app.get('/accounts/:accountId', checkPermissions(['read:accounts']), (req, res) => {
    const { accountId } = req.params;
    // In a real app, you'd fetch data for this accountId for the authenticated user
    // You can access user info from the token via req.auth.payload
    // e.g., const userId = req.auth.payload.sub;
    res.json({ message: `Accessing account ${accountId}`, data: { balance: 1234.56, currency: 'USD' } });
});

// Example: Create a new transaction - requires 'write:transactions' permission
app.post('/transactions', checkPermissions(['write:transactions']), (req, res) => {
    const { amount, type, description } = req.body;
    // Process the transaction for the authenticated user
    res.status(201).json({ message: 'Transaction created successfully', transaction: { amount, type, description } });
});

// Example: Admin route to manage users - requires 'manage:users' permission
app.put('/users/:userId', checkPermissions(['manage:users']), (req, res) => {
    const { userId } = req.params;
    // Logic to update user details
    res.json({ message: `User ${userId} updated successfully.` });
});

// Example: Admin dashboard access - requires 'admin' role
// This demonstrates using roles for broader access control
app.get('/admin-dashboard', checkRoles(['admin']), (req, res) => {
    res.json({ message: 'Welcome, Admin! This is your dashboard data.' });
});


// --- Error Handling Middleware ---
// IMPORTANT: This must be placed AFTER all your routes and other middlewares.
app.use(handleAuthErrors);

// Export the app instance to be used by the server
module.exports = app;