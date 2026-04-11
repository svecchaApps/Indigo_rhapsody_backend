const express = require("express");
const router = express.Router();
const stylistBookingController = require("../controllers/stylistBookingController");
const {
    authMiddleware,
    roleMiddleware,
} = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get(
    "/available-slots/:stylistId",
    stylistBookingController.getAvailableSlots
);

// User routes (authentication optional - can use userId parameter)
router.post(
    "/book-from-slot",
    stylistBookingController.bookFromSlot
);

router.post(
    "/create",
    authMiddleware,
    stylistBookingController.createBooking
);

router.post(
    "/payment/initiate/:bookingId",
    authMiddleware,
    stylistBookingController.initiatePayment
);

// Payment callback (from frontend after payment)
router.post(
    "/payment/callback",
    stylistBookingController.handlePaymentCallback
);

// NEW Razorpay webhook endpoint for stylist bookings (server-to-server from Razorpay)
// This is a separate webhook endpoint - does not disturb existing /payment/callback
// Note: This route should use express.raw() middleware in index.js for proper signature verification
router.post(
    "/razorpay-webhook",
    stylistBookingController.handleStylistBookingWebhook
);

// Public route - accepts userId as parameter
router.get(
    "/user-bookings",
    stylistBookingController.getUserBookings
);

// Public route - accepts userId as parameter
router.get(
    "/upcoming-sessions",
    stylistBookingController.getUpcomingSessions
);

router.post(
    "/start-video-call/:bookingId",
    authMiddleware,
    stylistBookingController.startVideoCall
);

router.post(
    "/end-video-call/:bookingId",
    authMiddleware,
    stylistBookingController.endVideoCall
);

router.post(
    "/reschedule/:bookingId",
    authMiddleware,
    stylistBookingController.rescheduleBooking
);

router.post(
    "/cancel/:bookingId",
    authMiddleware,
    stylistBookingController.cancelBooking
);

// Stylist routes (authentication + stylist role required)
router.get(
    "/stylist-bookings",
    authMiddleware,
    roleMiddleware(["Stylist"]),
    stylistBookingController.getStylistBookings
);

module.exports = router;
