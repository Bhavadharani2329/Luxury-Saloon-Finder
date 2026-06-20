const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Configure environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize database connection
connectDB();

const app = express();

// Middleware configurations
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes mounting
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/salons', require('./routes/salonRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Fallback to index.html for SPA page routings
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server executing in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Local Link: http://localhost:${PORT}/`);
});

