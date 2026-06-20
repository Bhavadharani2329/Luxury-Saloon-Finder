const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Review = require('../models/Review');

// @desc    Get all salons (with filter, search, sort, and pagination)
// @route   GET /api/salons
// @access  Public
const getSalons = async (req, res, next) => {
    try {
        let query = { isApproved: true };

        // Admin can view unapproved salons
        if (req.query.isAdminView === 'true') {
            query = {};
        }

        // Neighborhood / Location filter
        if (req.query.locations) {
            const locs = req.query.locations.split(',');
            query.neighborhood = { $in: locs };
        }

        // Category filter
        if (req.query.categories) {
            const cats = req.query.categories.split(',');
            // Retrieve service IDs matching these categories
            const matchingServices = await Service.find({ category: { $in: cats } }).select('_id');
            const serviceIds = matchingServices.map(s => s._id);
            query.services = { $in: serviceIds };
        }

        // Rating filter
        if (req.query.minRating) {
            query.rating = { $gte: parseFloat(req.query.minRating) };
        }

        // Price range filter IDs: 1: <2000, 2: 2000-5000, 3: 5000-10000, 4: >10000
        if (req.query.priceRanges) {
            const ranges = req.query.priceRanges.split(',').map(Number);
            const priceQueries = [];
            
            ranges.forEach(r => {
                if (r === 1) priceQueries.push({ startingPrice: { $lt: 2000 } });
                if (r === 2) priceQueries.push({ startingPrice: { $gte: 2000, $lte: 5000 } });
                if (r === 3) priceQueries.push({ startingPrice: { $gte: 5000, $lte: 10000 } });
                if (r === 4) priceQueries.push({ startingPrice: { $gt: 10000 } });
            });

            if (priceQueries.length > 0) {
                query.$or = priceQueries;
            }
        }

        // Search text
        if (req.query.search) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { description: { $regex: req.query.search, $options: 'i' } },
                    { neighborhood: { $regex: req.query.search, $options: 'i' } }
                ]
            });
        }

        let salonsQuery = Salon.find(query).populate('services').populate('owner', 'name email phone');

        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort;
            if (sortBy === 'price-low') {
                salonsQuery = salonsQuery.sort('startingPrice');
            } else if (sortBy === 'price-high') {
                salonsQuery = salonsQuery.sort('-startingPrice');
            } else if (sortBy === 'rating') {
                salonsQuery = salonsQuery.sort('-rating');
            }
        } else {
            salonsQuery = salonsQuery.sort('-createdAt'); // Default sort
        }

        const salons = await salonsQuery;
        res.json({
            success: true,
            count: salons.length,
            salons
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single salon by ID
// @route   GET /api/salons/:id
// @access  Public
const getSalonById = async (req, res, next) => {
    try {
        const salon = await Salon.findById(req.params.id).populate('services');
        if (!salon) {
            res.status(404);
            throw new Error('Salon not found');
        }

        // Fetch related reviews
        const reviews = await Review.find({ salon: salon._id }).populate('user', 'name avatar');

        res.json({
            success: true,
            salon,
            reviews
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new salon
// @route   POST /api/salons
// @access  Private (Salon Owner / Admin)
const createSalon = async (req, res, next) => {
    try {
        const { name, tagline, description, neighborhood, address, images, services, startingPrice, averagePrice, premiumPrice, openingHours, luxuryBadge } = req.body;

        if (!name || !tagline || !description || !neighborhood || !address || !startingPrice) {
            res.status(400);
            throw new Error('Please fill in all required salon descriptor fields');
        }

        const salon = await Salon.create({
            name,
            tagline,
            description,
            owner: req.user._id,
            neighborhood,
            address,
            images: images || [],
            services: services || [],
            startingPrice,
            averagePrice: averagePrice || startingPrice,
            premiumPrice: premiumPrice || startingPrice,
            openingHours,
            luxuryBadge: luxuryBadge || 'Bee Partner',
            isApproved: req.user.role === 'Admin' // auto-approve if admin registers it
        });

        res.status(201).json({
            success: true,
            salon
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update salon details
// @route   PUT /api/salons/:id
// @access  Private (Salon Owner / Admin)
const updateSalon = async (req, res, next) => {
    try {
        let salon = await Salon.findById(req.params.id);

        if (!salon) {
            res.status(404);
            throw new Error('Salon not found');
        }

        // Check ownership
        if (salon.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            res.status(403);
            throw new Error('Unauthorized update access');
        }

        salon = await Salon.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            salon
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve salon (Admin toggle)
// @route   POST /api/salons/:id/approve
// @access  Private (Admin)
const approveSalon = async (req, res, next) => {
    try {
        const salon = await Salon.findById(req.params.id);

        if (!salon) {
            res.status(404);
            throw new Error('Salon not found');
        }

        salon.isApproved = !salon.isApproved;
        await salon.save();

        res.json({
            success: true,
            message: `Salon approval state set to ${salon.isApproved}`,
            salon
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Admin Panel Analytics
// @route   GET /api/salons/admin/analytics
// @access  Private (Admin)
const getAdminAnalytics = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'Customer' });
        const totalBookings = await Booking.countDocuments();
        const totalSalons = await Salon.countDocuments();
        
        // Sum total bills
        const bookings = await Booking.find({ status: { $ne: 'Cancelled' } });
        const revenue = bookings.reduce((sum, b) => sum + (b.totalBill || 0), 0);

        // Fetch popular salons (top rated or most booked)
        const popularSalons = await Salon.find({ isApproved: true })
            .sort('-rating')
            .limit(3)
            .populate('services');

        res.json({
            success: true,
            analytics: {
                totalUsers,
                totalBookings,
                totalSalons,
                revenue,
                popularSalons
            }
        });
    } catch (error) {
        next(error);
    }
};

const createService = async (req, res, next) => {
    try {
        const { name, category, price, duration, description, salonId } = req.body;

        if (!name || !category || !price || !duration || !description || !salonId) {
            res.status(400);
            throw new Error('Please enter all service details (name, category, price, duration, description, salonId)');
        }

        const service = await Service.create({
            name,
            category,
            price,
            duration,
            description
        });

        // Add service to the salon
        const salon = await Salon.findById(salonId);
        if (!salon) {
            res.status(404);
            throw new Error('Salon not found');
        }
        salon.services.push(service._id);
        await salon.save();

        res.status(201).json({
            success: true,
            service
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSalons,
    getSalonById,
    createSalon,
    updateSalon,
    approveSalon,
    getAdminAnalytics,
    createService
};

