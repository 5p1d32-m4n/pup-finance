const express = require('express');
const jwtCheck = require('./middleware/authMiddleware');
const prisma = require('./config/prisma');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(jwtCheck);

// Routes
app.get('/', (req, res) => {
    res.send('Hello, Pup-Finance!');
});

// Example route to test the database connection
app.get('/test-db', async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT NOW()`;
        res.status(200).json({ message: 'Database connection successful with Prisma!', timestamp: result[0].now });
    } catch (err) {
        console.error('Database query error:', err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Export the app instance to be used by the server
module.exports = app;