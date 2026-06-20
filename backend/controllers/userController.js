const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'favorites',
            populate: { path: 'services' }
        });
        
        if (user) {
            res.json({
                success: true,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatar: user.avatar,
                    favorites: user.favorites,
                    membership: user.membership
                }
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.avatar = req.body.avatar || user.avatar;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();
            const populated = await User.findById(updatedUser._id).populate({
                path: 'favorites',
                populate: { path: 'services' }
            });

            res.json({
                success: true,
                user: {
                    _id: populated._id,
                    name: populated.name,
                    email: populated.email,
                    phone: populated.phone,
                    role: populated.role,
                    avatar: populated.avatar,
                    favorites: populated.favorites,
                    membership: populated.membership
                }
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle favorite salon
// @route   POST /api/users/favorites/:salonId
// @access  Private
const toggleFavorite = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const salonId = req.params.salonId;

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        const isFav = user.favorites.includes(salonId);
        if (isFav) {
            user.favorites = user.favorites.filter(id => id.toString() !== salonId);
        } else {
            user.favorites.push(salonId);
        }

        await user.save();
        const populated = await User.findById(user._id).populate({
            path: 'favorites',
            populate: { path: 'services' }
        });

        res.json({
            success: true,
            message: isFav ? 'Removed salon from favorites' : 'Added salon to favorites',
            favorites: populated.favorites
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Subscribe to membership
// @route   POST /api/users/subscribe
// @access  Private
const subscribeMembership = async (req, res, next) => {
    try {
        const { plan } = req.body; // 'Elite Monthly' or 'Elite Annual'
        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (plan !== 'Elite Monthly' && plan !== 'Elite Annual') {
            res.status(400);
            throw new Error('Invalid plan selection. Pick either "Elite Monthly" or "Elite Annual"');
        }

        const durationDays = plan === 'Elite Monthly' ? 30 : 365;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        user.membership = {
            plan,
            status: 'Active',
            startDate: new Date(),
            expiryDate
        };

        await user.save();
        res.json({
            success: true,
            message: `Successfully subscribed to ${plan}`,
            membership: user.membership
        });
    } catch (error) {
        next(error);
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({});
        res.json({
            success: true,
            users
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    toggleFavorite,
    subscribeMembership,
    getAllUsers
};
