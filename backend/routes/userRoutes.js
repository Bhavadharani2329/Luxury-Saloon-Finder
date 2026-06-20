const express = require('express');
const { getUserProfile, updateUserProfile, toggleFavorite, subscribeMembership, getAllUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth protection middleware to all user routes
router.use(protect);

router.route('/profile')
    .get(getUserProfile)
    .put(updateUserProfile);

router.post('/favorites/:salonId', toggleFavorite);
router.post('/subscribe', subscribeMembership);

// Admin-only route to list users
router.get('/', authorize('Admin'), getAllUsers);

module.exports = router;
