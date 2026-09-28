const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const bloodRequestRoutes = require('./routes/bloodRequestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const donorDirectoryRoutes = require('./routes/donorDirectoryRoutes');
const statsRoutes = require('./routes/statsRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running.' });
});

/* Liveness + database reachability, so the frontend can show a friendly
   "service unavailable" message instead of a generic network error. */
app.get('/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, database: 'connected' });
  } catch (error) {
    res.status(503).json({ success: false, database: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/donors', donorDirectoryRoutes);
app.use('/api/stats', statsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'The requested endpoint does not exist.' });
});

app.use(errorMiddleware);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

pool
  .query('SELECT 1')
  .then(() => console.log('MySQL connection established.'))
  .catch((error) => console.error('MySQL connection failed:', error.message));

module.exports = { app, server };
