const express = require("express");
const router = express.Router();
const designerController = require("../controllers/designerController");
const multer = require("multer");
const upload = require("../middleware/uploadMiddleWare");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get("/designers", designerController.getAllDesigners);
router.get("/designers/:id", designerController.getDesignerById);
router.get("/:designerId/details", designerController.getDesignerDetailsById);
router.get(
  "/total-count",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.getTotalDesignerCount
);
router.get(
  "/approved-count",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.getApprovedDesignerCount
);
router.get(
  "/pending-count",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.getPendingDesignerCount
);
router.get("/name/:userId", designerController.getDesignerNameByUserId);
router.get(
  "/:designerId/pickup-location",
  designerController.getPickupLocationName
);

// Authenticated routes (require valid JWT)

// Designer-specific routes (require Designer role)
router.post(
  "/designers",
  authMiddleware,
  roleMiddleware(["Designer"]),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "backGroundImage", maxCount: 1 },
  ]),
  designerController.createDesigner
);

router.put(
  "/designers/:id",
  authMiddleware,
  roleMiddleware(["Designer"]),
  upload.fields([{ name: "logo" }, { name: "backGroundImage" }]),
  designerController.updateDesigner
);

router.post(
  "/:designerId/request-update",
  authMiddleware,
  roleMiddleware(["Designer"]),
  designerController.requestUpdateDesignerInfo
);

router.post(
  "/:designerId/update-request",
  authMiddleware,
  roleMiddleware(["Designer"]),
  designerController.updateProfileRequest
);

// Admin-only routes (require Admin role)
router.get(
  "/designersDashboard",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.getAllDesignersForAdmin
);

router.get(
  "/update-requests/latest",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.getLatestUpdateRequests
);

router.patch(
  "/:designerId/status",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.updateDesignerApprovalStatus
);

router.patch(
  "/disable/:id",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.toggleDesignerApproval
);

router.put(
  "/review/:requestId",
  authMiddleware,
  roleMiddleware(["Admin"]),
  designerController.reviewUpdateRequests
);

// Delete route (Admin only)
router.delete(
  "/designers/:id",
  roleMiddleware(["Admin"]),
  designerController.deleteDesigner
);

router.post(
  "/createDesignerVideos",
  designerController.createDesignerVideosForProducts
);

// Get all designer videos for products (Public/Admin access)
router.get(
  "/createDesignerVideos",
  designerController.getAllDesignerVideosForProducts
);

// Get single designer video by ID (Public/Admin access)
router.get(
  "/createDesignerVideos/:id",
  designerController.getDesignerVideoForProductsById
);

// Approve designer video (Admin only)
router.patch(
  "/createDesignerVideos/:id/approve",

  designerController.ApproveDesignerVideoForProducts
);

// Reject designer video (Admin only)
router.patch(
  "/createDesignerVideos/:id/reject",

  designerController.rejectDesignerVideoForProducts
);

// Get designers for dropdown filters
router.get(
  "/dropdown",
  designerController.getDesignersForDropdown
);

// Product Sample Images routes
// Add product sample images using URLs (Designer only)
router.post(
  "/:designerId/product-sample-images",
  authMiddleware,
  roleMiddleware(["Designer", "Admin"]),
  designerController.addProductSampleImages
);

// Update/Edit product sample images using URLs (Designer only)
router.put(
  "/:designerId/product-sample-images",
  authMiddleware,
  roleMiddleware(["Designer", "Admin"]),
  designerController.updateProductSampleImages
);

// Get product sample images (Public - can be accessed by anyone)
router.get(
  "/:designerId/product-sample-images",
  designerController.getProductSampleImages
);

router.delete(
  "/:designerId/product-sample-images",
  authMiddleware,
  roleMiddleware(["Designer", "Admin"]),
  designerController.deleteProductSampleImages
);

// Get/calculate commission total for a designer (Designer or Admin)
router.get(
  "/:designerId/commission",
  authMiddleware,
  roleMiddleware(["Designer", "Admin"]),
  designerController.getCommissionTotalForDesigner
);

module.exports = router;
