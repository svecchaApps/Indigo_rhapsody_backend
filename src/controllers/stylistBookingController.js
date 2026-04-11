const mongoose = require("mongoose");
const StylistBooking = require("../models/stylistBooking");
const StylistProfile = require("../models/stylistProfile");
const StylistAvailability = require("../models/stylistAvailability");
const User = require("../models/userModel");
const { Chat, Message } = require("../models/chat");
const RazorpayService = require("../service/razorpayService");
const AgoraService = require("../service/agoraService");
const { createNotification, sendFcmNotification } = require("./notificationController");

class StylistBookingController {

    /**
     * Get available time slots for a stylist
     */
    static async getAvailableSlots(req, res) {
        try {
            const { stylistId } = req.params;
            const { date, duration = 60 } = req.query;

            if (!stylistId || !date) {
                return res.status(400).json({
                    success: false,
                    message: "Stylist ID and date are required"
                });
            }

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(stylistId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }

            // Check if stylist exists and is approved
            const stylist = await StylistProfile.findOne({
                _id: stylistId,
                applicationStatus: 'approved',
                isApproved: true
            });

            if (!stylist) {
                return res.status(404).json({
                    success: false,
                    message: "Stylist not found or not approved"
                });
            }

            // Get stylist availability
            let availability = await StylistAvailability.findOne({ stylistId });

            if (!availability) {
                // Create default availability if not exists
                availability = new StylistAvailability({
                    stylistId,
                    isActive: true,
                    weeklySchedule: {
                        monday: { isAvailable: true, startTime: "09:00", endTime: "18:00", breaks: [] },
                        tuesday: { isAvailable: true, startTime: "09:00", endTime: "18:00", breaks: [] },
                        wednesday: { isAvailable: true, startTime: "09:00", endTime: "18:00", breaks: [] },
                        thursday: { isAvailable: true, startTime: "09:00", endTime: "18:00", breaks: [] },
                        friday: { isAvailable: true, startTime: "09:00", endTime: "18:00", breaks: [] },
                        saturday: { isAvailable: true, startTime: "09:00", endTime: "18:00", breaks: [] },
                        sunday: { isAvailable: false, startTime: "09:00", endTime: "18:00", breaks: [] }
                    },
                    dateOverrides: [],
                    bookingPreferences: {
                        minAdvanceBooking: 2,
                        maxAdvanceBooking: 30,
                        slotDuration: 60,
                        maxBookingsPerDay: 8,
                        bufferTime: 15
                    }
                });
                await availability.save();
            }

            // Get available slots
            const availableSlots = availability.getAvailableSlots(new Date(date), duration);

            // Filter out slots that are already booked
            const existingBookings = await StylistBooking.find({
                stylistId,
                scheduledDate: new Date(date),
                status: { $in: ['confirmed', 'in_progress'] }
            });

            const filteredSlots = availableSlots.filter(slot => {
                return !existingBookings.some(booking => {
                    const bookingStart = new Date(booking.scheduledDate);
                    const [bookingHour, bookingMinute] = booking.scheduledTime.split(':');
                    bookingStart.setHours(parseInt(bookingHour), parseInt(bookingMinute), 0, 0);

                    const bookingEnd = new Date(bookingStart.getTime() + (booking.duration * 60000));
                    const slotStart = new Date(slot.datetime);
                    const slotEnd = new Date(slotStart.getTime() + (duration * 60000));

                    return (slotStart < bookingEnd && slotEnd > bookingStart);
                });
            });

            return res.status(200).json({
                success: true,
                message: "Available slots retrieved successfully",
                data: {
                    stylistId,
                    date,
                    duration,
                    availableSlots: filteredSlots,
                    totalSlots: filteredSlots.length
                }
            });

        } catch (error) {
            console.error("Get available slots error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to get available slots",
                error: error.message
            });
        }
    }

    /**
     * Book from selected slot
     * Validates slot availability and creates booking with payment flow
     */
    static async bookFromSlot(req, res) {
        try {
            const {
                stylistId,
                slotDate, // Date in YYYY-MM-DD format
                slotStartTime, // Time in HH:MM format
                slotEndTime, // Time in HH:MM format (optional, can be calculated)
                bookingType = 'consultation',
                bookingTitle,
                bookingDescription,
                duration
            } = req.body;

            // Get userId from body or authenticated user
            const userId = req.body.userId || (req.user ? req.user._id : null);

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User ID is required"
                });
            }

            // Validate required fields
            if (!stylistId || !slotDate || !slotStartTime || !bookingTitle || !bookingDescription) {
                return res.status(400).json({
                    success: false,
                    message: "stylistId, slotDate, slotStartTime, bookingTitle, and bookingDescription are required"
                });
            }

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(stylistId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID format"
                });
            }

            // Check if stylist exists and is approved
            const stylist = await StylistProfile.findOne({
                _id: stylistId,
                applicationStatus: 'approved',
                isApproved: true
            });

            if (!stylist) {
                return res.status(404).json({
                    success: false,
                    message: "Stylist not found or not approved"
                });
            }

            // Get availability
            const availability = await StylistAvailability.findOne({ stylistId });

            if (!availability || !availability.isActive) {
                return res.status(400).json({
                    success: false,
                    message: "Stylist is not available for booking"
                });
            }

            // Parse date and validate slot
            const bookingDate = new Date(slotDate);
            const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const daySchedule = availability.weeklySchedule[dayOfWeek];

            if (!daySchedule || !daySchedule.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `Stylist is not available on ${dayOfWeek}`
                });
            }

            // Check if slot exists and is available
            let selectedSlot = null;
            if (daySchedule.slots && daySchedule.slots.length > 0) {
                selectedSlot = daySchedule.slots.find(slot => 
                    slot.startTime === slotStartTime && 
                    slot.isAvailable === true
                );

                if (!selectedSlot) {
                    return res.status(400).json({
                        success: false,
                        message: `Selected slot (${slotStartTime}) is not available`
                    });
                }

                // Check if slot has reached max bookings
                const existingBookingsForSlot = await StylistBooking.countDocuments({
                    stylistId,
                    scheduledDate: bookingDate,
                    scheduledTime: slotStartTime,
                    status: { $in: ['pending', 'confirmed', 'in_progress'] },
                    isCancelled: false
                });

                if (existingBookingsForSlot >= selectedSlot.maxBookings) {
                    return res.status(400).json({
                        success: false,
                        message: "This slot is fully booked"
                    });
                }
            } else {
                // No slots defined, use startTime/endTime range
                const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(slotStartTime)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid slot time format. Use HH:MM format (24-hour)"
                    });
                }

                // Check if time is within available range
                if (slotStartTime < daySchedule.startTime || slotStartTime >= daySchedule.endTime) {
                    return res.status(400).json({
                        success: false,
                        message: `Selected time is outside available hours (${daySchedule.startTime} - ${daySchedule.endTime})`
                    });
                }
            }

            // Check for existing bookings at the same time
            const existingBooking = await StylistBooking.findOne({
                stylistId,
                userId,
                scheduledDate: bookingDate,
                scheduledTime: slotStartTime,
                status: { $in: ['pending', 'confirmed', 'in_progress'] },
                isCancelled: false
            });

            if (existingBooking) {
                return res.status(400).json({
                    success: false,
                    message: "You already have a booking at this time"
                });
            }

            // Calculate duration
            let bookingDuration = duration || 60;
            if (selectedSlot && selectedSlot.duration) {
                bookingDuration = selectedSlot.duration;
            } else if (slotEndTime) {
                // Calculate duration from start and end time
                const [startHour, startMin] = slotStartTime.split(':').map(Number);
                const [endHour, endMin] = slotEndTime.split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                bookingDuration = endMinutes - startMinutes;
            }

            // Calculate payment amount
            const paymentAmount = stylist.stylistPrice || 1000;

            // Create booking with pending status
            const booking = new StylistBooking({
                userId,
                stylistId,
                bookingType,
                bookingTitle,
                bookingDescription,
                scheduledDate: bookingDate,
                scheduledTime: slotStartTime,
                duration: bookingDuration,
                paymentAmount,
                status: 'pending',
                paymentStatus: 'pending'
            });

            await booking.save();

            // Create Razorpay order immediately
            const orderData = {
                amount: paymentAmount,
                currency: 'INR',
                receipt: `booking_${booking._id}`,
                notes: {
                    bookingId: booking._id.toString(),
                    userId: userId.toString(),
                    stylistId: stylistId.toString(),
                    bookingType: bookingType
                }
            };

            const orderResult = await RazorpayService.createOrder(orderData);

            if (!orderResult.success) {
                // Delete booking if payment order creation fails
                await StylistBooking.findByIdAndDelete(booking._id);
                return res.status(500).json({
                    success: false,
                    message: "Failed to create payment order",
                    error: orderResult.message
                });
            }

            // Update booking with payment order ID
            booking.razorpayOrderId = orderResult.data.orderId;
            booking.paymentStatus = 'processing';
            booking.updatedAt = new Date();
            await booking.save();

            // Get user details for payment
            const user = await User.findById(userId);

            // Generate client payment options
            const paymentOptions = RazorpayService.generatePaymentOptions({
                ...orderResult.data,
                name: 'IndigoRhapsody',
                description: `Stylist Booking - ${bookingTitle}`,
                customerName: user?.displayName || 'Customer',
                customerEmail: user?.email || '',
                customerPhone: user?.phoneNumber || ''
            });

            return res.status(201).json({
                success: true,
                message: "Booking created. Please complete payment to confirm.",
                data: {
                    booking: {
                        _id: booking._id,
                        bookingId: booking.bookingId,
                        bookingType: booking.bookingType,
                        bookingTitle: booking.bookingTitle,
                        scheduledDate: booking.scheduledDate,
                        scheduledTime: booking.scheduledTime,
                        duration: booking.duration,
                        paymentAmount: booking.paymentAmount,
                        status: booking.status,
                        paymentStatus: booking.paymentStatus
                    },
                    payment: {
                        orderId: orderResult.data.orderId,
                        amount: paymentAmount,
                        currency: 'INR',
                        paymentOptions: paymentOptions,
                        expiresIn: 1800 // 30 minutes
                    }
                }
            });

        } catch (error) {
            console.error("Book from slot error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to create booking from slot",
                error: error.message
            });
        }
    }

    /**
     * Create a new booking
     */
    static async createBooking(req, res) {
        try {
            const {
                stylistId,
                bookingType = 'consultation',
                bookingTitle,
                bookingDescription,
                scheduledDate,
                scheduledTime,
                duration = 60
            } = req.body;

            const userId = req.user._id;

            // Validate required fields
            if (!stylistId || !bookingTitle || !bookingDescription || !scheduledDate || !scheduledTime) {
                return res.status(400).json({
                    success: false,
                    message: "All required fields must be provided"
                });
            }

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(stylistId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }

            // Check if stylist exists and is approved
            const stylist = await StylistProfile.findOne({
                _id: stylistId,
                applicationStatus: 'approved',
                isApproved: true
            });

            if (!stylist) {
                return res.status(404).json({
                    success: false,
                    message: "Stylist not found or not approved"
                });
            }

            // Check if slot is available
            const slotDate = new Date(scheduledDate);
            const availability = await StylistAvailability.findOne({ stylistId });

            if (availability && !availability.isAvailableAt(slotDate, scheduledTime)) {
                return res.status(400).json({
                    success: false,
                    message: "Selected time slot is not available"
                });
            }

            // Check for existing bookings at the same time
            const existingBooking = await StylistBooking.findOne({
                stylistId,
                scheduledDate: slotDate,
                scheduledTime,
                status: { $in: ['confirmed', 'in_progress'] }
            });

            if (existingBooking) {
                return res.status(400).json({
                    success: false,
                    message: "Time slot is already booked"
                });
            }

            // Calculate payment amount
            const paymentAmount = stylist.stylistPrice || 1000; // Default price

            // Create booking
            const booking = new StylistBooking({
                userId,
                stylistId,
                bookingType,
                bookingTitle,
                bookingDescription,
                scheduledDate: slotDate,
                scheduledTime,
                duration,
                paymentAmount,
                status: 'pending'
            });

            await booking.save();

            // Create chat between user and stylist
            const chatResult = await Chat.findOrCreateChat(userId, stylistId, booking._id);

            if (chatResult.success) {
                // Send system message about booking creation
                const systemMessage = new Message({
                    chatId: chatResult.data._id,
                    senderId: userId,
                    content: `New booking created: ${bookingTitle}`,
                    messageType: 'system',
                    systemData: {
                        type: 'booking_created',
                        bookingId: booking._id,
                        metadata: {
                            bookingType,
                            scheduledDate: slotDate,
                            scheduledTime,
                            duration
                        }
                    }
                });
                await systemMessage.save();
            }

            return res.status(201).json({
                success: true,
                message: "Booking created successfully. Please complete payment to confirm.",
                data: {
                    bookingId: booking._id,
                    bookingType: booking.bookingType,
                    scheduledDate: booking.scheduledDate,
                    scheduledTime: booking.scheduledTime,
                    duration: booking.duration,
                    paymentAmount: booking.paymentAmount,
                    status: booking.status,
                    nextStep: 'payment'
                }
            });

        } catch (error) {
            console.error("Create booking error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to create booking",
                error: error.message
            });
        }
    }

    /**
     * Initiate payment for booking
     */
    static async initiatePayment(req, res) {
        try {
            const { bookingId } = req.params;
            const userId = req.user._id;

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking ID format"
                });
            }

            // Find booking
            const booking = await StylistBooking.findById(bookingId).populate('stylistId');

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            // Check if booking belongs to user
            if (booking.userId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Check booking status
            if (booking.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Booking cannot be paid for. Current status: ${booking.status}`
                });
            }

            if (booking.paymentStatus === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: "Payment already completed for this booking"
                });
            }

            // Create Razorpay order
            const orderData = {
                amount: booking.paymentAmount,
                currency: 'INR',
                receipt: `booking_${bookingId}`,
                notes: {
                    bookingId: bookingId,
                    userId: userId.toString(),
                    stylistId: booking.stylistId.toString(),
                    bookingType: booking.bookingType
                },
                customerDetails: {
                    name: req.user.displayName,
                    email: req.user.email,
                    contact: req.user.phoneNumber
                }
            };

            const orderResult = await RazorpayService.createOrder(orderData);

            if (!orderResult.success) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to create payment order",
                    error: orderResult.message
                });
            }

            // Update booking with payment details
            booking.razorpayOrderId = orderResult.data.orderId;
            booking.paymentStatus = 'processing';
            booking.updatedAt = new Date();

            await booking.save();

            // Generate client payment options
            const paymentOptions = RazorpayService.generatePaymentOptions({
                ...orderResult.data,
                name: 'IndigoRhapsody',
                description: `Stylist Booking - ${booking.bookingTitle}`,
                customerName: req.user.displayName,
                customerEmail: req.user.email,
                customerPhone: req.user.phoneNumber
            });

            return res.status(200).json({
                success: true,
                message: "Payment initiated successfully",
                data: {
                    bookingId: booking._id,
                    orderId: orderResult.data.orderId,
                    amount: booking.paymentAmount,
                    currency: 'INR',
                    paymentOptions: paymentOptions,
                    expiresIn: 1800 // 30 minutes
                }
            });

        } catch (error) {
            console.error("Initiate payment error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to initiate payment",
                error: error.message
            });
        }
    }

    /**
     * Handle payment callback
     */
    static async handlePaymentCallback(req, res) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

            // Verify payment signature
            const isValidSignature = RazorpayService.verifyPaymentSignature({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });

            if (!isValidSignature) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment signature"
                });
            }

            // Find booking by order ID
            const booking = await StylistBooking.findOne({
                razorpayOrderId: razorpay_order_id
            }).populate('stylistId userId');

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found for this payment"
                });
            }

            // Update booking with payment details
            booking.razorpayPaymentId = razorpay_payment_id;
            booking.razorpaySignature = razorpay_signature;
            booking.paymentStatus = 'completed';
            booking.paymentCompletedAt = new Date();
            booking.status = 'confirmed';
            booking.updatedAt = new Date();

            await booking.save();

            // Send notifications
            try {
                // Get user FCM token
                const user = await User.findById(booking.userId._id);
                const stylistUser = await User.findById(booking.stylistId.userId);

                // Notify user
                if (user) {
                    const userNotification = {
                        userId: booking.userId._id,
                        message: `Your booking with ${booking.stylistId.stylistName} has been confirmed for ${booking.scheduledDate.toDateString()} at ${booking.scheduledTime}.`,
                        title: "Booking Confirmed"
                    };

                    await createNotification(userNotification);
                    
                    if (user.fcmToken) {
                        await sendFcmNotification(
                            user.fcmToken,
                            "Booking Confirmed",
                            `Your booking with ${booking.stylistId.stylistName} has been confirmed.`
                        );
                    }
                }

                // Notify stylist
                if (stylistUser) {
                    const stylistNotification = {
                        userId: booking.stylistId.userId,
                        message: `You have a new booking from ${booking.userId.displayName} on ${booking.scheduledDate.toDateString()} at ${booking.scheduledTime}.`,
                        title: "New Booking Received"
                    };

                    await createNotification(stylistNotification);
                    
                    if (stylistUser.fcmToken) {
                        await sendFcmNotification(
                            stylistUser.fcmToken,
                            "New Booking Received",
                            `You have a new booking from ${booking.userId.displayName}.`
                        );
                    }
                }

                // Schedule reminder notification (30 minutes before booking)
                await scheduleBookingReminder(booking);

            } catch (notificationError) {
                console.error("Notification error:", notificationError);
            }

            return res.status(200).json({
                success: true,
                message: "Payment completed successfully. Booking confirmed.",
                data: {
                    bookingId: booking._id,
                    paymentStatus: 'completed',
                    bookingStatus: 'confirmed',
                    paymentId: razorpay_payment_id
                }
            });

        } catch (error) {
            console.error("Payment callback error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to process payment callback",
                error: error.message
            });
        }
    }

    /**
     * Get user's bookings
     * Accepts userId from body, query, or authenticated user
     */
    static async getUserBookings(req, res) {
        try {
            // Get userId from body, query, or authenticated user
            const userId = req.body.userId || req.query.userId || (req.user ? req.user._id : null);
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User ID is required. Provide userId in body, query, or authenticate."
                });
            }

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID format"
                });
            }

            const { page = 1, limit = 10, status } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            let query = { userId };
            if (status) {
                query.status = status;
            }

            const bookings = await StylistBooking.find(query)
                .populate('stylistId', 'stylistName stylistImage stylistBio stylistCity stylistState stylistPhone stylistEmail')
                .populate('userId', 'displayName email phoneNumber profilePicture')
                .sort({ scheduledDate: -1, scheduledTime: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const totalBookings = await StylistBooking.countDocuments(query);

            return res.status(200).json({
                success: true,
                message: "User bookings retrieved successfully",
                data: {
                    bookings,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalBookings / parseInt(limit)),
                        totalBookings,
                        hasNextPage: skip + bookings.length < totalBookings,
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            });

        } catch (error) {
            console.error("Get user bookings error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to get user bookings",
                error: error.message
            });
        }
    }

    /**
     * Get stylist's bookings
     */
    static async getStylistBookings(req, res) {
        try {
            const stylistId = req.user._id; // Assuming user is stylist
            const { page = 1, limit = 10, status } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            let query = { stylistId };
            if (status) {
                query.status = status;
            }

            const bookings = await StylistBooking.find(query)
                .populate('userId', 'displayName email phoneNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const totalBookings = await StylistBooking.countDocuments(query);

            return res.status(200).json({
                success: true,
                message: "Stylist bookings retrieved successfully",
                data: {
                    bookings,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalBookings / parseInt(limit)),
                        totalBookings,
                        hasNextPage: skip + bookings.length < totalBookings,
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            });

        } catch (error) {
            console.error("Get stylist bookings error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to get stylist bookings",
                error: error.message
            });
        }
    }

    /**
     * Start video call
     */
    static async startVideoCall(req, res) {
        try {
            const { bookingId } = req.params;
            const userId = req.user._id;

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking ID format"
                });
            }

            // Find booking
            const booking = await StylistBooking.findById(bookingId)
                .populate('stylistId userId');

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            // Check if user is authorized (either user or stylist)
            const isUser = booking.userId._id.toString() === userId.toString();
            const isStylist = booking.stylistId.userId.toString() === userId.toString();

            if (!isUser && !isStylist) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Check booking status
            if (booking.status !== 'confirmed') {
                return res.status(400).json({
                    success: false,
                    message: `Video call cannot be started. Booking status: ${booking.status}`
                });
            }

            // Check if it's time for the call (allow 15 minutes before scheduled time)
            const now = new Date();
            const callTime = new Date(booking.scheduledDate);
            const [hours, minutes] = booking.scheduledTime.split(':');
            callTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const timeUntilCall = (callTime - now) / (1000 * 60); // minutes

            if (timeUntilCall > 15) {
                return res.status(400).json({
                    success: false,
                    message: "Video call can only be started 15 minutes before scheduled time"
                });
            }

            // Generate Agora tokens
            const channelName = AgoraService.generateChannelName(
                bookingId,
                booking.stylistId._id,
                booking.userId._id
            );

            const tokenResult = AgoraService.generateTokens(channelName, userId.toString());

            if (!tokenResult.success) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to generate video call tokens",
                    error: tokenResult.message
                });
            }

            // Update booking status
            booking.videoCallStatus = 'initiated';
            booking.agoraChannelName = channelName;
            booking.agoraToken = tokenResult.data.rtcToken.token;
            booking.videoCallStartedAt = new Date();
            booking.status = 'in_progress';
            booking.updatedAt = new Date();

            await booking.save();

            return res.status(200).json({
                success: true,
                message: "Video call initiated successfully",
                data: {
                    bookingId: booking._id,
                    channelName: channelName,
                    appId: process.env.AGORA_APP_ID,
                    rtcToken: tokenResult.data.rtcToken.token,
                    rtmToken: tokenResult.data.rtmToken.token,
                    uid: userId.toString(),
                    expirationTime: tokenResult.data.expirationTime,
                    expiresIn: 3600
                }
            });

        } catch (error) {
            console.error("Start video call error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to start video call",
                error: error.message
            });
        }
    }

    /**
     * End video call
     */
    static async endVideoCall(req, res) {
        try {
            const { bookingId } = req.params;
            const userId = req.user._id;

            // Find booking
            const booking = await StylistBooking.findById(bookingId);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            // Check authorization
            const isUser = booking.userId.toString() === userId.toString();
            const isStylist = booking.stylistId.toString() === userId.toString();

            if (!isUser && !isStylist) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Update booking
            const callEndTime = new Date();
            const callDuration = booking.videoCallStartedAt ?
                Math.round((callEndTime - booking.videoCallStartedAt) / (1000 * 60)) : 0;

            booking.videoCallStatus = 'ended';
            booking.videoCallEndedAt = callEndTime;
            booking.videoCallDuration = callDuration;
            booking.status = 'completed';
            booking.completedAt = callEndTime;
            booking.updatedAt = callEndTime;

            await booking.save();

            return res.status(200).json({
                success: true,
                message: "Video call ended successfully",
                data: {
                    bookingId: booking._id,
                    callDuration: callDuration,
                    endedAt: callEndTime
                }
            });

        } catch (error) {
            console.error("End video call error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to end video call",
                error: error.message
            });
        }
    }

    /**
     * Reschedule booking
     */
    static async rescheduleBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const { newDate, newTime, reason } = req.body;
            const userId = req.user._id;

            // Find booking
            const booking = await StylistBooking.findById(bookingId);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            // Check authorization
            if (booking.userId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Check if booking can be rescheduled
            if (!booking.canBeRescheduled) {
                return res.status(400).json({
                    success: false,
                    message: "Booking cannot be rescheduled at this time"
                });
            }

            // Create new booking for rescheduled time
            const rescheduledBooking = new StylistBooking({
                ...booking.toObject(),
                _id: new mongoose.Types.ObjectId(),
                scheduledDate: new Date(newDate),
                scheduledTime: newTime,
                isRescheduled: true,
                originalBookingId: booking._id,
                rescheduleReason: reason,
                rescheduledAt: new Date(),
                rescheduledBy: userId,
                status: 'pending',
                paymentStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await rescheduledBooking.save();

            // Update original booking
            booking.status = 'rescheduled';
            booking.updatedAt = new Date();
            await booking.save();

            return res.status(200).json({
                success: true,
                message: "Booking rescheduled successfully",
                data: {
                    originalBookingId: booking._id,
                    rescheduledBookingId: rescheduledBooking._id,
                    newDate: rescheduledBooking.scheduledDate,
                    newTime: rescheduledBooking.scheduledTime,
                    reason: reason
                }
            });

        } catch (error) {
            console.error("Reschedule booking error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to reschedule booking",
                error: error.message
            });
        }
    }

    /**
     * Cancel booking
     */
    static async cancelBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const { reason } = req.body;
            const userId = req.user._id;

            // Find booking
            const booking = await StylistBooking.findById(bookingId);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            // Check authorization
            if (booking.userId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Check if booking can be cancelled
            if (!booking.canBeCancelled) {
                return res.status(400).json({
                    success: false,
                    message: "Booking cannot be cancelled at this time"
                });
            }

            // Update booking
            booking.status = 'cancelled';
            booking.isCancelled = true;
            booking.cancellationReason = reason;
            booking.cancelledAt = new Date();
            booking.cancelledBy = userId;
            booking.updatedAt = new Date();

            await booking.save();

            // Process refund if payment was completed
            if (booking.paymentStatus === 'completed' && booking.razorpayPaymentId) {
                try {
                    const refundResult = await RazorpayService.createRefund(
                        booking.razorpayPaymentId,
                        booking.paymentAmount,
                        `Booking cancellation - ${reason}`
                    );

                    if (refundResult.success) {
                        booking.paymentStatus = 'refunded';
                        await booking.save();
                    }
                } catch (refundError) {
                    console.error("Refund error:", refundError);
                }
            }

            return res.status(200).json({
                success: true,
                message: "Booking cancelled successfully",
                data: {
                    bookingId: booking._id,
                    status: booking.status,
                    cancelledAt: booking.cancelledAt,
                    reason: reason
                }
            });

        } catch (error) {
            console.error("Cancel booking error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to cancel booking",
                error: error.message
            });
        }
    }

    /**
     * Get user's upcoming sessions
     * Returns upcoming bookings that are scheduled in the future
     * Returns dummy data if no bookings exist
     */
    static async getUpcomingSessions(req, res) {
        try {
            // Get userId from request body or query parameters
            const userId = req.body.userId || req.query.userId;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User ID is required. Please provide userId in request body or query parameters."
                });
            }
            
            // Convert userId to ObjectId if it's a string
            let userIdObjectId;
            try {
                userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
                    ? new mongoose.Types.ObjectId(userId) 
                    : userId;
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID format"
                });
            }
            
            const { limit = 10 } = req.query;

            const now = new Date();

            // Build query for upcoming sessions
            // Get bookings that are scheduled in the future and not cancelled/completed
            const query = {
                userId: userIdObjectId,
                status: { $in: ['pending', 'confirmed', 'in_progress'] },
                isCancelled: false
            };

            // Get all bookings matching the query
            const allBookings = await StylistBooking.find(query)
                .populate('stylistId', 'stylistName stylistImage stylistBio stylistCity stylistState stylistPhone stylistEmail')
                .sort({ scheduledDate: 1, scheduledTime: 1 });

            // Filter for upcoming sessions (scheduled date/time in the future)
            const upcomingSessions = allBookings.filter(booking => {
                const scheduledDate = new Date(booking.scheduledDate);
                const [hours, minutes] = booking.scheduledTime.split(':');
                scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                return scheduledDate > now;
            });

            // Limit results
            const limitedSessions = upcomingSessions.slice(0, parseInt(limit));

            // If no upcoming sessions, return dummy data
            if (limitedSessions.length === 0) {
                const dummySessions = [
                    {
                        _id: "507f1f77bcf86cd799439011",
                        bookingId: "BOOK_1703123456789_abc123def",
                        userId: userId,
                        stylistId: {
                            _id: "507f191e810c19729de860ea",
                            stylistName: "Sarah's Fashion Studio",
                            stylistImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
                            stylistBio: "Professional stylist with 8+ years of experience",
                            stylistCity: "Mumbai",
                            stylistState: "Maharashtra",
                            stylistPhone: "+1234567890",
                            stylistEmail: "sarah.stylist@example.com"
                        },
                        bookingType: "consultation",
                        bookingTitle: "Personal Styling Consultation",
                        bookingDescription: "Initial consultation to understand your style preferences and fashion goals",
                        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                        scheduledTime: "14:00",
                        duration: 60,
                        timezone: "Asia/Kolkata",
                        status: "confirmed",
                        paymentStatus: "completed",
                        paymentAmount: 2000,
                        paymentCurrency: "INR",
                        paymentMethod: "razorpay",
                        videoCallStatus: "not_started",
                        isRescheduled: false,
                        isCancelled: false,
                        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                    },
                    {
                        _id: "507f1f77bcf86cd799439012",
                        bookingId: "BOOK_1703123456790_def456ghi",
                        userId: userId,
                        stylistId: {
                            _id: "507f191e810c19729de860eb",
                            stylistName: "Michael's Style Lab",
                            stylistImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
                            stylistBio: "Award-winning stylist specializing in contemporary fashion",
                            stylistCity: "Delhi",
                            stylistState: "Delhi",
                            stylistPhone: "+1234567891",
                            stylistEmail: "michael.stylist@example.com"
                        },
                        bookingType: "styling_session",
                        bookingTitle: "Complete Wardrobe Makeover",
                        bookingDescription: "Full wardrobe consultation and styling session",
                        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                        scheduledTime: "10:00",
                        duration: 120,
                        timezone: "Asia/Kolkata",
                        status: "confirmed",
                        paymentStatus: "completed",
                        paymentAmount: 5000,
                        paymentCurrency: "INR",
                        paymentMethod: "razorpay",
                        videoCallStatus: "not_started",
                        isRescheduled: false,
                        isCancelled: false,
                        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                    },
                    {
                        _id: "507f1f77bcf86cd799439013",
                        bookingId: "BOOK_1703123456791_jkl789mno",
                        userId: userId,
                        stylistId: {
                            _id: "507f191e810c19729de860ec",
                            stylistName: "Emma's Wardrobe Consulting",
                            stylistImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
                            stylistBio: "Expert in wardrobe optimization and sustainable fashion",
                            stylistCity: "Bangalore",
                            stylistState: "Karnataka",
                            stylistPhone: "+1234567892",
                            stylistEmail: "emma.stylist@example.com"
                        },
                        bookingType: "makeover",
                        bookingTitle: "Special Event Makeover",
                        bookingDescription: "Complete makeover for upcoming special event",
                        scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
                        scheduledTime: "16:00",
                        duration: 90,
                        timezone: "Asia/Kolkata",
                        status: "pending",
                        paymentStatus: "pending",
                        paymentAmount: 3500,
                        paymentCurrency: "INR",
                        paymentMethod: "razorpay",
                        videoCallStatus: "not_started",
                        isRescheduled: false,
                        isCancelled: false,
                        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
                    }
                ];

                // Limit dummy data
                const limitedDummySessions = dummySessions.slice(0, parseInt(limit));

                return res.status(200).json({
                    success: true,
                    message: "Upcoming sessions retrieved successfully (dummy data - no actual bookings found)",
                    data: {
                        upcomingSessions: limitedDummySessions,
                        totalUpcoming: limitedDummySessions.length,
                        isDummyData: true
                    }
                });
            }

            // Format sessions with additional calculated fields
            const formattedSessions = limitedSessions.map(booking => {
                const scheduledDate = new Date(booking.scheduledDate);
                const [hours, minutes] = booking.scheduledTime.split(':');
                scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                
                const now = new Date();
                const hoursUntilBooking = Math.floor((scheduledDate - now) / (1000 * 60 * 60));
                const daysUntilBooking = Math.floor(hoursUntilBooking / 24);

                return {
                    ...booking.toObject(),
                    scheduledDateTime: scheduledDate,
                    hoursUntilBooking: hoursUntilBooking,
                    daysUntilBooking: daysUntilBooking,
                    isUpcoming: true,
                    canBeCancelled: booking.status === 'confirmed' && 
                                   booking.paymentStatus === 'completed' && 
                                   !booking.isCancelled && 
                                   hoursUntilBooking > 2,
                    canBeRescheduled: booking.status === 'confirmed' && 
                                     booking.paymentStatus === 'completed' && 
                                     !booking.isCancelled && 
                                     !booking.isRescheduled && 
                                     hoursUntilBooking > 24
                };
            });

            return res.status(200).json({
                success: true,
                message: "Upcoming sessions retrieved successfully",
                data: {
                    upcomingSessions: formattedSessions,
                    totalUpcoming: upcomingSessions.length,
                    isDummyData: false
                }
            });

        } catch (error) {
            console.error("Get upcoming sessions error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to get upcoming sessions",
                error: error.message
            });
        }
    }

    /**
     * Handle Razorpay webhook for stylist bookings (NEW endpoint)
     * This is a separate webhook endpoint specifically for stylist booking payments
     * Receives webhooks directly from Razorpay servers
     */
    static async handleStylistBookingWebhook(req, res) {
        try {
            // Get webhook signature from header
            const webhookSignature = req.headers['x-razorpay-signature'];
            
            if (!webhookSignature) {
                return res.status(400).json({
                    success: false,
                    message: "Missing X-Razorpay-Signature header"
                });
            }

            // Get raw body for signature verification
            let rawBody;
            if (Buffer.isBuffer(req.body)) {
                rawBody = req.body.toString('utf8');
            } else if (typeof req.body === 'string') {
                rawBody = req.body;
            } else {
                // Fallback: stringify the parsed body
                rawBody = JSON.stringify(req.body);
            }

            // Verify webhook signature using webhook secret
            const isValidSignature = RazorpayService.verifyWebhookSignature(rawBody, webhookSignature);

            if (!isValidSignature) {
                console.error("Invalid webhook signature for stylist booking");
                return res.status(400).json({
                    success: false,
                    message: "Invalid webhook signature"
                });
            }

            // Parse webhook data
            const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const { event, payload } = webhookData;

            console.log(`Stylist booking Razorpay webhook received: ${event}`);

            // Handle different webhook events
            switch (event) {
                case 'payment.captured':
                    return await processStylistBookingPaymentCaptured(payload, res);

                case 'payment.failed':
                    return await processStylistBookingPaymentFailed(payload, res);

                case 'order.paid':
                    return await processStylistBookingOrderPaid(payload, res);

                default:
                    console.log(`Unhandled webhook event for stylist booking: ${event}`);
                    return res.status(200).json({
                        success: true,
                        message: "Webhook received but event not handled",
                        event: event
                    });
            }

        } catch (error) {
            console.error("Stylist booking Razorpay webhook error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to process webhook",
                error: error.message
            });
        }
    }
}

/**
 * Process payment.captured webhook for stylist bookings
 */
async function processStylistBookingPaymentCaptured(payload, res) {
    try {
        const paymentEntity = payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        // Find booking by order ID
        const booking = await StylistBooking.findOne({
            razorpayOrderId: orderId
        }).populate('stylistId userId');

        if (!booking) {
            console.error(`Stylist booking not found for order: ${orderId}`);
            return res.status(200).json({
                success: true,
                message: "Webhook processed but booking not found",
                orderId: orderId
            });
        }

        // Update booking if not already confirmed
        if (booking.paymentStatus !== 'completed') {
            booking.razorpayPaymentId = paymentId;
            booking.paymentStatus = 'completed';
            booking.paymentCompletedAt = new Date();
            booking.status = 'confirmed';
            booking.updatedAt = new Date();
            await booking.save();

            // Send notifications
            try {
                const user = await User.findById(booking.userId._id);
                const stylistUser = await User.findById(booking.stylistId.userId);

                // Notify user
                if (user) {
                    const userNotification = {
                        userId: booking.userId._id,
                        message: `Your booking with ${booking.stylistId.stylistName} has been confirmed for ${booking.scheduledDate.toDateString()} at ${booking.scheduledTime}.`,
                        title: "Booking Confirmed"
                    };

                    await createNotification(userNotification);
                    
                    if (user.fcmToken) {
                        await sendFcmNotification(
                            user.fcmToken,
                            "Booking Confirmed",
                            `Your booking with ${booking.stylistId.stylistName} has been confirmed.`
                        );
                    }
                }

                // Notify stylist
                if (stylistUser) {
                    const stylistNotification = {
                        userId: booking.stylistId.userId,
                        message: `You have a new booking from ${booking.userId.displayName} on ${booking.scheduledDate.toDateString()} at ${booking.scheduledTime}.`,
                        title: "New Booking Received"
                    };

                    await createNotification(stylistNotification);
                    
                    if (stylistUser.fcmToken) {
                        await sendFcmNotification(
                            stylistUser.fcmToken,
                            "New Booking Received",
                            `You have a new booking from ${booking.userId.displayName}.`
                        );
                    }
                }

                // Schedule reminder notification
                await scheduleBookingReminder(booking);

            } catch (notificationError) {
                console.error("Notification error:", notificationError);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Stylist booking payment captured webhook processed successfully",
            data: {
                bookingId: booking._id,
                paymentId: paymentId,
                orderId: orderId
            }
        });

    } catch (error) {
        console.error("Error processing stylist booking payment.captured webhook:", error);
        return res.status(500).json({
            success: false,
            message: "Error processing payment captured webhook",
            error: error.message
        });
    }
}

/**
 * Process payment.failed webhook for stylist bookings
 */
async function processStylistBookingPaymentFailed(payload, res) {
    try {
        const paymentEntity = payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        // Find booking by order ID
        const booking = await StylistBooking.findOne({
            razorpayOrderId: orderId
        });

        if (booking) {
            booking.paymentStatus = 'failed';
            booking.razorpayPaymentId = paymentId;
            booking.status = 'pending';
            booking.updatedAt = new Date();
            await booking.save();

            // Notify user about payment failure
            try {
                const user = await User.findById(booking.userId);
                if (user && user.fcmToken) {
                    await sendFcmNotification(
                        user.fcmToken,
                        "Payment Failed",
                        "Your payment for the booking failed. Please try again."
                    );
                }
            } catch (notificationError) {
                console.error("Notification error:", notificationError);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Stylist booking payment failed webhook processed",
            orderId: orderId
        });

    } catch (error) {
        console.error("Error processing stylist booking payment.failed webhook:", error);
        return res.status(500).json({
            success: false,
            message: "Error processing payment failed webhook",
            error: error.message
        });
    }
}

/**
 * Process order.paid webhook for stylist bookings
 */
async function processStylistBookingOrderPaid(payload, res) {
    try {
        const orderEntity = payload.order.entity;
        const orderId = orderEntity.id;

        // Find booking by order ID
        const booking = await StylistBooking.findOne({
            razorpayOrderId: orderId
        });

        if (booking && booking.paymentStatus !== 'completed') {
            // This is a backup confirmation if payment.captured wasn't received
            booking.paymentStatus = 'completed';
            booking.status = 'confirmed';
            booking.updatedAt = new Date();
            await booking.save();

            // Schedule reminder
            await scheduleBookingReminder(booking);
        }

        return res.status(200).json({
            success: true,
            message: "Stylist booking order paid webhook processed",
            orderId: orderId
        });

    } catch (error) {
        console.error("Error processing stylist booking order.paid webhook:", error);
        return res.status(500).json({
            success: false,
            message: "Error processing order paid webhook",
            error: error.message
        });
    }
}

/**
 * Schedule reminder notification for booking (30 minutes before)
 */
async function scheduleBookingReminder(booking) {
    try {
        // Calculate reminder time (30 minutes before booking)
        const scheduledDate = new Date(booking.scheduledDate);
        const [hours, minutes] = booking.scheduledTime.split(':');
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const reminderTime = new Date(scheduledDate.getTime() - (30 * 60 * 1000)); // 30 minutes before
        const now = new Date();
        
        // Only schedule if reminder time is in the future
        if (reminderTime <= now) {
            console.log(`Reminder time has passed for booking ${booking._id}, skipping reminder`);
            return;
        }

        // Calculate delay in milliseconds
        const delay = reminderTime.getTime() - now.getTime();

        // Schedule notification
        setTimeout(async () => {
            try {
                // Check if booking is still valid
                const currentBooking = await StylistBooking.findById(booking._id)
                    .populate('userId', 'displayName email phoneNumber fcmToken')
                    .populate('stylistId', 'stylistName');

                if (!currentBooking || currentBooking.status === 'cancelled' || currentBooking.isCancelled) {
                    console.log(`Booking ${booking._id} was cancelled, skipping reminder`);
                    return;
                }

                // Get user
                const user = await User.findById(currentBooking.userId._id);

                if (user && user.fcmToken) {
                    // Send reminder notification
                    await sendFcmNotification(
                        user.fcmToken,
                        "Booking Reminder",
                        `Your booking with ${currentBooking.stylistId.stylistName} is in 30 minutes at ${currentBooking.scheduledTime}.`
                    );

                    // Create notification record
                    await createNotification({
                        userId: user._id,
                        message: `Your booking with ${currentBooking.stylistId.stylistName} is in 30 minutes at ${currentBooking.scheduledTime}.`,
                        title: "Booking Reminder"
                    });

                    console.log(`Reminder notification sent for booking ${booking._id}`);
                }
            } catch (error) {
                console.error(`Error sending reminder for booking ${booking._id}:`, error);
            }
        }, delay);

        console.log(`Reminder scheduled for booking ${booking._id} at ${reminderTime}`);
    } catch (error) {
        console.error("Error scheduling booking reminder:", error);
    }
}

module.exports = StylistBookingController;
