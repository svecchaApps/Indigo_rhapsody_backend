const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
router.get("/searchUser", couponController.searchUsers);
router.get("/active", couponController.getActiveCoupons);
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
