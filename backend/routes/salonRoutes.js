const express = require('express');
const { getSalons, getSalonById, createSalon, updateSalon, approveSalon, getAdminAnalytics, createService } = require('../controllers/salonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', getSalons);
router.get('/admin/analytics', protect, authorize('Admin'), getAdminAnalytics);
router.get('/:id', getSalonById);

// Protected routes (require registration as Salon Owner or Admin)
router.post('/', protect, authorize('Salon Owner', 'Admin'), createSalon);
router.put('/:id', protect, authorize('Salon Owner', 'Admin'), updateSalon);
router.post('/services', protect, authorize('Salon Owner', 'Admin'), createService);

// Admin-only routes
router.post('/:id/approve', protect, authorize('Admin'), approveSalon);

module.exports = router;
