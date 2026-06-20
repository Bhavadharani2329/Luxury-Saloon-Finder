const express = require('express');
const { createReview, getSalonReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/salon/:salonId', getSalonReviews);

// Protected review posting
router.post('/', protect, createReview);

module.exports = router;
