const mongoose = require("mongoose");

const stylistProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false, // Not required during application phase
    },
    // Temporary user data stored during application process
    tempUserData: {
        displayName: String,
        email: String,
        phoneNumber: String,
        password: String, // Will be hashed after approval
    },
    stylistName: {
        type: String,
        required: true,
    },
    stylistEmail: {
        type: String,
        required: true,
    },
    stylistPhone: {
        type: String,
        required: true,
    },
    stylistAddress: {
        type: String,
        required: true,
    },
    stylistCity: {
        type: String,
        required: true,
    },
    stylistState: {
        type: String,
        required: true,
    },
    stylistPincode: {
        type: String,
        required: true,
    },
    stylistCountry: {
        type: String,
        required: true,
    },
    stylistImage: {
        type: String,
        required: true,
    },
    stylistBio: {
        type: String,
        required: true,
    },
    stylistPortfolio: [{
        type: String,
        required: true,
    }],
    stylistExperience: {
        type: String,
        required: true,
    },
    stylistEducation: {
        type: String,
        required: true,
    },
    stylistSkills: [{
        type: String,
        required: true,
    }],
    stylistCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "StylistCategory",
    }],
    stylistAvailability: {
        type: String,
        required: true,
    },
    stylistPrice: {
        type: Number,
    },
    stylistRating: {
        type: Number,
    },
    stylistReviews: [{
        type: String,
        required: true,
    }],
    // Application and approval system fields
    applicationStatus: {
        type: String,
        enum: ['draft', 'submitted', 'payment_pending', 'payment_completed', 'under_review', 'approved', 'rejected'],
        default: 'draft',
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    isTopStylist: {
        type: Boolean,
        default: false,
    },
    isTopStylist: {
        type: Boolean,
        default: false,
    },
    // Payment fields
    registrationFee: {
        type: Number,
        default: 500, // Default registration fee in INR
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
    },
    paymentId: {
        type: String, // PhonePe transaction ID
    },
    razorpayOrderId: {
        type: String, // Razorpay order ID
    },
    razorpayPaymentId: {
        type: String, // Razorpay payment ID
    },
    razorpaySignature: {
        type: String, // Razorpay payment signature
    },
    paymentReferenceId: {
        type: String, // Our internal reference ID
    },
    paymentAmount: {
        type: Number,
    },
    paymentCurrency: {
        type: String,
        default: 'INR',
    },
    paymentMethod: {
        type: String,
        default: 'razorpay',
    },
    paymentCompletedAt: {
        type: Date,
    },
    approvedAt: {
        type: Date,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    rejectedAt: {
        type: Date,
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    rejectionReason: {
        type: String,
    },
    adminNotes: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Booking-related fields
    bookingSettings: {
        isAvailableForBooking: {
            type: Boolean,
            default: true
        },
        minAdvanceBooking: {
            type: Number, // Hours
            default: 2
        },
        maxAdvanceBooking: {
            type: Number, // Days
            default: 30
        },
        slotDuration: {
            type: Number, // Minutes
            default: 60
        },
        maxBookingsPerDay: {
            type: Number,
            default: 8
        },
        bufferTime: {
            type: Number, // Minutes between bookings
            default: 15
        },
        cancellationPolicy: {
            type: String,
            enum: ['flexible', 'moderate', 'strict'],
            default: 'moderate'
        },
        reschedulingPolicy: {
            type: String,
            enum: ['flexible', 'moderate', 'strict'],
            default: 'moderate'
        }
    },

    // Booking statistics
    bookingStats: {
        totalBookings: {
            type: Number,
            default: 0
        },
        completedBookings: {
            type: Number,
            default: 0
        },
        cancelledBookings: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        lastBookingDate: {
            type: Date
        }
    },

    // Video call settings
    videoCallSettings: {
        isVideoCallEnabled: {
            type: Boolean,
            default: true
        },
        preferredVideoQuality: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        maxCallDuration: {
            type: Number, // Minutes
            default: 120
        }
    },

    // Chat settings
    chatSettings: {
        isChatEnabled: {
            type: Boolean,
            default: true
        },
        autoReplyEnabled: {
            type: Boolean,
            default: false
        },
        autoReplyMessage: {
            type: String
        },
        responseTime: {
            type: String,
            enum: ['immediate', 'within_1_hour', 'within_24_hours', 'custom'],
            default: 'within_24_hours'
        }
    },

    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Indexes for better query performance
stylistProfileSchema.index({ userId: 1 });
stylistProfileSchema.index({ applicationStatus: 1 });
stylistProfileSchema.index({ isApproved: 1 });
stylistProfileSchema.index({ stylistEmail: 1 });
stylistProfileSchema.index({ 'bookingSettings.isAvailableForBooking': 1 });
stylistProfileSchema.index({ stylistCategories: 1 });

// Pre-save middleware to update the updatedAt field
stylistProfileSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Static method to find approved stylists
stylistProfileSchema.statics.findApprovedStylists = function () {
    return this.find({
        applicationStatus: 'approved',
        isApproved: true,
        'bookingSettings.isAvailableForBooking': true
    });
};

// Instance method to check if stylist is available for booking
stylistProfileSchema.methods.isAvailableForBooking = function () {
    return this.applicationStatus === 'approved' &&
        this.isApproved === true &&
        this.bookingSettings.isAvailableForBooking === true;
};

module.exports = mongoose.model("StylistProfile", stylistProfileSchema);