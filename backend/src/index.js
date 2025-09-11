const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/user');
const levelsRoutes = require('./routes/levels');
const boardRoutes = require('./routes/board');
const progressRoutes = require('./routes/progress');
const challengeRoutes = require('./routes/challenge');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006', 'exp://'],
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use('/api/user', userRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/challenge', challengeRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', {
    level: 'error',
    route: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
  });

  res.status(error.status || 500).json({
    error: true,
    message: error.message || 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: `Route ${req.method} ${req.baseUrl} not found`,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;