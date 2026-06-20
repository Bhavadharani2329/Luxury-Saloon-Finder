const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token helper
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_bee_token_key_123', {
        expiresIn: '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password || !phone) {
            res.status(400);
            throw new Error('Please enter all required fields (name, email, password, phone)');
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            throw new Error('User already exists with this email address');
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: role || 'Customer'
        });

        if (user) {
            res.status(201).json({
                success: true,
                token: generateToken(user._id),
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
            res.status(400);
            throw new Error('Invalid user account registration details');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error('Please enter email and password');
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password'); // Explicitly fetch password field if select: false is set
        if (!user) {
            res.status(401);
            throw new Error('Invalid email or password');
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            res.status(401);
            throw new Error('Invalid email or password');
        }

        res.json({
            success: true,
            token: generateToken(user._id),
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
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser
};
