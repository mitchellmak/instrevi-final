const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/instrevi';

let dbConnected = false;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection (retry instead of crashing process)
const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    dbConnected = false;
    console.error('MongoDB connection failed. Retrying in 5s...', error.message);
    setTimeout(connectWithRetry, 5000);
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'instrevi-api',
    dbConnected
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    dbConnected
  });
});

connectWithRetry();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
