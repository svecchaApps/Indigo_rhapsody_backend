const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
router.post("/", authMiddleware, cartController.createCart);
router.put("/update", authMiddleware, cartController.updateQuantity);
router.post("/addItem", authMiddleware, cartController.addItemToCart);
router.post("/deleteItem", authMiddleware, cartController.deleteItem);
router.get("/getCart/:userId", authMiddleware, cartController.getCartForUser);
router.post("/CreateCart", authMiddleware, cartController.upsertCart);

router.get("/cart-id/:userId", authMiddleware, cartController.getCartIdByUserId);
router.get("/cart-details/:userId", authMiddleware, cartController.getCartDetailsByUserId);
router.get("/total/:userId", cartController.getCartTotalByUserId);
router.get("/total", cartController.getCartTotalByUserId); 
router.put("/update-address/:userId", authMiddleware, cartController.updateCartAddress);

module.exports = router;
