const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_bee_token_key_123');
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User account not found' });
            }
            
            return next();
        } catch (error) {
            console.error('JWT validation error:', error.message);
            return res.status(401).json({ success: false, message: 'Not authorized, token validation failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, missing authentication token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: User role '${req.user ? req.user.role : 'Guest'}' is not authorized to access this resource`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
