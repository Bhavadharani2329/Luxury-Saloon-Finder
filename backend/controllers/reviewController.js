const Review = require('../models/Review');
const Salon = require('../models/Salon');

// @desc    Submit a new review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res, next) => {
    try {
        const { salonId, rating, comment } = req.body;

        if (!salonId || !rating || !comment) {
            res.status(400);
            throw new Error('Please enter all required review fields (salonId, rating, comment)');
        }

        const salon = await Salon.findById(salonId);
        if (!salon) {
            res.status(404);
            throw new Error('Salon not found');
        }

        // Create review
        const review = await Review.create({
            user: req.user._id,
            salon: salonId,
            rating: parseInt(rating),
            comment
        });

        // Recalculate Salon Rating
        const reviews = await Review.find({ salon: salonId });
        const count = reviews.length;
        const average = reviews.reduce((sum, r) => sum + r.rating, 0) / count;

        salon.rating = parseFloat(average.toFixed(1));
        salon.ratingCount = count;
        await salon.save();

        res.status(201).json({
            success: true,
            review,
            salonRating: salon.rating,
            salonRatingCount: salon.ratingCount
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all reviews for a specific salon
// @route   GET /api/reviews/salon/:salonId
// @access  Public
const getSalonReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ salon: req.params.salonId })
            .populate('user', 'name avatar')
            .sort('-createdAt');

        res.json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReview,
    getSalonReviews
};
