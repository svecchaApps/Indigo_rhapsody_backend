const express = require("express");
const router = express.Router();
const stylistBannerController = require("../controllers/stylistBannerController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

// ==================== PUBLIC ROUTES ====================

// Get stylist banners by position (must be before /:bannerId to avoid route conflict)
router.get(
  "/position/:position",
  stylistBannerController.getStylistBannersByPosition
);

// Get all stylist banners (with filters)
router.get("/", stylistBannerController.getStylistBanners);

// Get single stylist banner by ID
router.get("/:bannerId", stylistBannerController.getStylistBannerById);

// Track stylist banner click (public)
router.post(
  "/:bannerId/click",
  stylistBannerController.trackStylistBannerClick
);

// Track stylist banner impression (public)
router.post(
  "/:bannerId/impression",
  stylistBannerController.trackStylistBannerImpression
);

// ==================== ADMIN ONLY ROUTES ====================

// Reorder stylist banners (must be before /:bannerId routes to avoid conflict)
router.post(
  "/reorder",
  authMiddleware,
  roleMiddleware(["Admin"]),
  stylistBannerController.reorderStylistBanners
);

// Create new stylist banner
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin"]),
  stylistBannerController.createStylistBanner
);

// Get stylist banner analytics (specific route before general /:bannerId)
router.get(
  "/:bannerId/analytics",
  authMiddleware,
  roleMiddleware(["Admin"]),
  stylistBannerController.getStylistBannerAnalytics
);

// Toggle stylist banner active status
router.patch(
  "/:bannerId/toggle",
  authMiddleware,
  roleMiddleware(["Admin"]),
  stylistBannerController.toggleStylistBannerStatus
);

// Update stylist banner
router.put(
  "/:bannerId",
  authMiddleware,
  roleMiddleware(["Admin"]),
  stylistBannerController.updateStylistBanner
);

// Delete stylist banner
router.delete(
  "/:bannerId",
  authMiddleware,
  roleMiddleware(["Admin"]),
  stylistBannerController.deleteStylistBanner
);

module.exports = router;

