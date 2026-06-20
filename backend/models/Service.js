const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['Hair', 'Spa', 'Skin', 'Makeup', 'Grooming', 'Nails'], 
        required: true 
    },
    duration: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        default: '' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
