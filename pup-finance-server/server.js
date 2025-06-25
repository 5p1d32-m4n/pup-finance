require('dotenv').config();

const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server is running: http://localhost:${PORT}`);
    console.log(`AUTH0 Domain: ${process.env.AUTH0_DOMAIN}`)
    console.log(`AUTH0 Audience: ${process.env.AUTH0_AUDIENCE}`)
})