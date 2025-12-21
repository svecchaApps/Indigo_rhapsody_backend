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

// User routes (authentication required)
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

router.post(
    "/payment/callback",
    stylistBookingController.handlePaymentCallback
);

router.get(
    "/user-bookings",
    authMiddleware,
    stylistBookingController.getUserBookings
);

router.get(
    "/upcoming-sessions",
    authMiddleware,
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
