const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");
const paymentController = require("../controllers/paymentController");

router.post("/createPayment", paymentController.createPaymentDetails);
router.get(
  "/getPaymentDetails/:paymentId",
  paymentController.getPaymentDetails
);
router.get(
  "/transaction/:transactionId",
  paymentController.getPaymentDetailsByTransactionId
);
router.put(
  "/updatePaymentDetails/:paymentId",
  paymentController.updatePaymentDetails
);
router.post("/webhook", paymentController.paymentWebhook);

module.exports = router;
