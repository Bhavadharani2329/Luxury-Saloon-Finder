const mongoose = require('mongoose');

const SalonSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    tagline: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    neighborhood: { 
        type: String, 
        required: true 
    },
    address: { 
        type: String, 
        required: true 
    },
    images: [{ 
        type: String 
    }],
    services: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Service' 
    }],
    startingPrice: { 
        type: Number, 
        required: true 
    },
    averagePrice: { 
        type: Number, 
        required: true 
    },
    premiumPrice: { 
        type: Number, 
        required: true 
    },
    rating: { 
        type: Number, 
        default: 5.0 
    },
    ratingCount: { 
        type: Number, 
        default: 0 
    },
    openingHours: { 
        type: String, 
        default: "10:00 AM - 09:00 PM" 
    },
    luxuryBadge: { 
        type: String, 
        default: "Bee Partner" 
    },
    isApproved: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('Salon', SalonSchema);
