const mongoose = require("mongoose");

const stylistAvailabilitySchema = new mongoose.Schema({
    stylistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StylistProfile",
        required: true
    },

    // Weekly availability pattern
    weeklySchedule: {
        monday: {
            isAvailable: {
                type: Boolean,
                default: true
            },
            startTime: {
                type: String, // Format: "HH:MM"
                default: "09:00"
            },
            endTime: {
                type: String, // Format: "HH:MM"
                default: "18:00"
            },
            // Slot-based scheduling (specific time slots)
            slots: [{
                startTime: {
                    type: String, // Format: "HH:MM"
                    required: true
                },
                endTime: {
                    type: String, // Format: "HH:MM"
                    required: true
                },
                duration: {
                    type: Number, // Duration in minutes
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number, // Max bookings for this slot
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        },
        tuesday: {
            isAvailable: {
                type: Boolean,
                default: true
            },
            startTime: {
                type: String,
                default: "09:00"
            },
            endTime: {
                type: String,
                default: "18:00"
            },
            slots: [{
                startTime: {
                    type: String,
                    required: true
                },
                endTime: {
                    type: String,
                    required: true
                },
                duration: {
                    type: Number,
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number,
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        },
        wednesday: {
            isAvailable: {
                type: Boolean,
                default: true
            },
            startTime: {
                type: String,
                default: "09:00"
            },
            endTime: {
                type: String,
                default: "18:00"
            },
            slots: [{
                startTime: {
                    type: String,
                    required: true
                },
                endTime: {
                    type: String,
                    required: true
                },
                duration: {
                    type: Number,
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number,
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        },
        thursday: {
            isAvailable: {
                type: Boolean,
                default: true
            },
            startTime: {
                type: String,
                default: "09:00"
            },
            endTime: {
                type: String,
                default: "18:00"
            },
            slots: [{
                startTime: {
                    type: String,
                    required: true
                },
                endTime: {
                    type: String,
                    required: true
                },
                duration: {
                    type: Number,
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number,
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        },
        friday: {
            isAvailable: {
                type: Boolean,
                default: true
            },
            startTime: {
                type: String,
                default: "09:00"
            },
            endTime: {
                type: String,
                default: "18:00"
            },
            slots: [{
                startTime: {
                    type: String,
                    required: true
                },
                endTime: {
                    type: String,
                    required: true
                },
                duration: {
                    type: Number,
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number,
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        },
        saturday: {
            isAvailable: {
                type: Boolean,
                default: true
            },
            startTime: {
                type: String,
                default: "09:00"
            },
            endTime: {
                type: String,
                default: "18:00"
            },
            slots: [{
                startTime: {
                    type: String,
                    required: true
                },
                endTime: {
                    type: String,
                    required: true
                },
                duration: {
                    type: Number,
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number,
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        },
        sunday: {
            isAvailable: {
                type: Boolean,
                default: false
            },
            startTime: {
                type: String,
                default: "09:00"
            },
            endTime: {
                type: String,
                default: "18:00"
            },
            slots: [{
                startTime: {
                    type: String,
                    required: true
                },
                endTime: {
                    type: String,
                    required: true
                },
                duration: {
                    type: Number,
                    default: 60
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                },
                maxBookings: {
                    type: Number,
                    default: 1
                }
            }],
            breaks: [{
                startTime: String,
                endTime: String,
                reason: String
            }]
        }
    },

    // Specific date overrides
    dateOverrides: [{
        date: {
            type: Date,
            required: true
        },
        isAvailable: {
            type: Boolean,
            required: true
        },
        startTime: String,
        endTime: String,
        reason: String,
        breaks: [{
            startTime: String,
            endTime: String,
            reason: String
        }]
    }],

    // Booking preferences
    bookingPreferences: {
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
        }
    },

    // Timezone
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
stylistAvailabilitySchema.index({ stylistId: 1 });
stylistAvailabilitySchema.index({ 'dateOverrides.date': 1 });

// Pre-save middleware
stylistAvailabilitySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Method to check if stylist is available at specific time
stylistAvailabilitySchema.methods.isAvailableAt = function (date, time) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase().substring(0, 3);
    const daySchedule = this.weeklySchedule[dayOfWeek];

    // Check if day is available in weekly schedule
    if (!daySchedule.isAvailable) {
        return false;
    }

    // Check for date-specific overrides
    const dateOverride = this.dateOverrides.find(override =>
        override.date.toDateString() === targetDate.toDateString()
    );

    if (dateOverride) {
        if (!dateOverride.isAvailable) {
            return false;
        }
        // Use override times if available
        if (dateOverride.startTime && dateOverride.endTime) {
            return time >= dateOverride.startTime && time <= dateOverride.endTime;
        }
    }

    // Check weekly schedule times
    return time >= daySchedule.startTime && time <= daySchedule.endTime;
};

// Method to get available time slots for a specific date
stylistAvailabilitySchema.methods.getAvailableSlots = function (date, duration = 60) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase().substring(0, 3);
    const daySchedule = this.weeklySchedule[dayOfWeek];

    // Check if day is available
    if (!daySchedule.isAvailable) {
        return [];
    }

    // Check for date-specific overrides
    const dateOverride = this.dateOverrides.find(override =>
        override.date.toDateString() === targetDate.toDateString()
    );

    let startTime, endTime, breaks = [];

    if (dateOverride) {
        if (!dateOverride.isAvailable) {
            return [];
        }
        startTime = dateOverride.startTime || daySchedule.startTime;
        endTime = dateOverride.endTime || daySchedule.endTime;
        breaks = dateOverride.breaks || [];
    } else {
        startTime = daySchedule.startTime;
        endTime = daySchedule.endTime;
        breaks = daySchedule.breaks || [];
    }

    const availableSlots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Generate 30-minute slots
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const slotStartTime = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
        const slotEndMinutes = minutes + duration;
        const slotEndTime = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;

        // Check if slot conflicts with breaks
        const hasBreakConflict = breaks.some(breakItem => {
            const breakStart = breakItem.startTime;
            const breakEnd = breakItem.endTime;
            return (slotStartTime < breakEnd && slotEndTime > breakStart);
        });

        if (!hasBreakConflict && slotEndMinutes <= endMinutes) {
            availableSlots.push({
                startTime: slotStartTime,
                endTime: slotEndTime,
                duration: duration
            });
        }
    }

    return availableSlots;
};

module.exports = mongoose.model("StylistAvailability", stylistAvailabilitySchema);
