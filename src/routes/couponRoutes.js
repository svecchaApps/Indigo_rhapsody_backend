const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
router.get("/searchUser", couponController.searchUsers);
router.post("/", authMiddleware, roleMiddleware(["Admin"]), couponController.createCoupon);
router.get("/", couponController.getAllCoupons);
// router.get("/getall", couponController.getAllCouponsAll);
router.get("/:id", couponController.getCouponById);

router.put("/:id", authMiddleware, roleMiddleware(["Admin"]), couponController.updateCoupon);
router.delete("/:id", authMiddleware, roleMiddleware(["Admin"]), couponController.deleteCoupon);
router.post(
  "/applyCoupon",
  // roleMiddleware(["User"]),
  couponController.applyCouponToCart
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
