const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    },
    avatar: { 
        type: String, 
        default: '' 
    },
    phone: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['Customer', 'Salon Owner', 'Admin'], 
        default: 'Customer' 
    },
    favorites: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Salon' 
    }],
    membership: {
        plan: { 
            type: String, 
            enum: ['None', 'Elite Monthly', 'Elite Annual'], 
            default: 'None' 
        },
        status: { 
            type: String, 
            enum: ['Active', 'Expired', 'None'], 
            default: 'None' 
        },
        startDate: { 
            type: Date 
        },
        expiryDate: { 
            type: Date 
        }
    }
}, { timestamps: true });

UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Helper to check entered passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
