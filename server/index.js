const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
require('dotenv').config();

const app = express();

// --- Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DB
const connectDB = require('./db');

// --- Health endpoints
let isReady = false; // flips true after DB connects

// Fast path for platform healthcheck (no DB wait)
app.get('/health', (_req, res) => res.status(200).send('ok'));

// More detailed health including DB readiness
app.get('/api/health', (_req, res) => {
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'OK' : 'STARTING',
    message: isReady ? 'Server and DB ready' : 'Server up, DB not ready yet'
  });
});

// --- Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/super-categories', require('./routes/superCategories'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));

// --- Error handlers
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.use('*', (_req, res) => res.status(404).json({ message: 'Route not found' }));

// --- Start server THEN connect DB
const PORT = process.env.PORT || config.PORT || 5000;

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  try {
    await connectDB({ serverSelectionTimeoutMS: 5000 }); // optional: fail fast
    isReady = true;
    console.log('DB connected');
  } catch (e) {
    console.error('DB connection failed', e);
    // keep serving /health so Railway doesn’t kill the deploy; /api routes may fail until env is fixed
  }
};

startServer();

module.exports = app; // (handy for tests)
