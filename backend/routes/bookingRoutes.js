const express = require('express');
const { createBooking, getMyBookings, getOwnerBookings, updateBookingStatus } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth protection middleware to all booking routes
router.use(protect);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);

// Owner/Admin specific booking routes
router.get('/owner-bookings', authorize('Salon Owner', 'Admin'), getOwnerBookings);
router.put('/:id/status', authorize('Salon Owner', 'Admin'), updateBookingStatus);

module.exports = router;
