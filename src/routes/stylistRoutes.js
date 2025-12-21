const express = require("express");
const router = express.Router();
const stylistController = require("../controllers/stylistController");
const {
    authMiddleware,
    roleMiddleware,
} = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get(
    "/approved",
    stylistController.getApprovedStylistProfiles
);

router.get(
    "/categories",
    stylistController.getStylistCategories
);

router.get(
    "/category/:categoryId",
    stylistController.getStylistsByCategory
);

// User routes (authentication required)
router.post(
    "/create",
    authMiddleware,
    stylistController.createStylistProfile
);

router.get(
    "/my-profile",
    authMiddleware,
    stylistController.getMyStylistProfile
);

router.put(
    "/update",
    authMiddleware,
    stylistController.updateStylistProfile
);

router.delete(
    "/delete",
    authMiddleware,
    stylistController.deleteStylistProfile
);

// Admin routes (authentication + admin role required)
router.get(
    "/all",
    authMiddleware,
    roleMiddleware(["Admin"]),
    stylistController.getAllStylistProfiles
);

router.get(
    "/pending",
    authMiddleware,
    roleMiddleware(["Admin"]),
    stylistController.getPendingStylistProfiles
);

router.get(
    "/statistics",
    authMiddleware,
    roleMiddleware(["Admin"]),
    stylistController.getStylistStatistics
);

router.post(
    "/approve/:stylistId",
    authMiddleware,
    roleMiddleware(["Admin"]),
    stylistController.approveStylistProfile
);

router.post(
    "/reject/:stylistId",
    authMiddleware,
    roleMiddleware(["Admin"]),
    stylistController.rejectStylistProfile
);

// Get specific stylist profile by user ID (public)
router.get(
    "/profile/:userId",
    stylistController.getStylistProfile
);

// Admin routes for category management
router.post(
    "/category/create",
    authMiddleware,
    roleMiddleware(["Admin"]),
    stylistController.createStylistCategory
);

module.exports = router;
