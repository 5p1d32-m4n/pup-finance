import app from './app';
import prisma from './config/prisma';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// --- Cleanup Handling ---
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received - shutting down gracefully.`);
  server.close(async () => {
    console.log('Server closed.');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // For local development (Ctrl+C)