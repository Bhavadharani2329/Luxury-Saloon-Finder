const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    salon: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Salon', 
        required: true 
    },
    services: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Service', 
        required: true 
    }],
    appointmentDate: { 
        type: Date, 
        required: true 
    },
    timeSlot: { 
        type: String, 
        required: true 
    },
    totalBill: { 
        type: Number, 
        required: true 
    },
    conciergeFee: { 
        type: Number, 
        default: 250 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], 
        default: 'Pending' 
    },
    paymentStatus: { 
        type: String, 
        enum: ['Pending', 'Paid'], 
        default: 'Pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
