const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
router.get("/searchUser", couponController.searchUsers);
router.get("/active", couponController.getActiveCoupons);
// Cron endpoint to trigger cleanup of stale/expired coupons from carts.
// Protected by a secret token (set CRON_SECRET in env). Vercel scheduled job should POST here.
router.post("/cron/cleanup-coupons", async (req, res) => {
  try {
    const token = req.headers["x-cron-token"] || req.query.token;
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await couponController.cleanupStaleCouponsFromCarts();
    return res.status(200).json({ success: true, message: "Cleanup triggered" });
  } catch (err) {
    console.error("Error triggering cron cleanup:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/", authMiddleware, roleMiddleware(["Admin"]), couponController.createCoupon);
router.get("/", couponController.getAllCoupons);
// router.get("/getall", couponController.getAllCouponsAll);
router.get("/:id", couponController.getCouponById);

router.put("/:id", authMiddleware, roleMiddleware(["Admin"]), couponController.updateCoupon);
router.delete("/:id", authMiddleware, roleMiddleware(["Admin"]), couponController.deleteCoupon);
// Applies coupon to cart; supports promotion & user-specific coupons. Body: { userId, couponCode, cartId }
router.post(
  "/applyCoupon",
  couponController.applyCouponUniversal
);
router.post(
  "/particularUser",
  authMiddleware,
  roleMiddleware(["Admin"]),
  couponController.createCouponForParticularUser
);
router.post(
  "/createCouponForPromotion",
  couponController.createCouponForPromotion
);

router.post("/applyUniversal", couponController.applyCouponUniversal);

module.exports = router;
