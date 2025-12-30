const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/orderModel");
const PaymentDetails = require("../models/paymentDetailsModel");
const { createOrder } = require("./orderController"); // Import your order controller
const RazorpayService = require("../service/razorpayService");
const Cart = require("../models/cartModel");

// 1. Create a Payment
// 1. Create a Payment
function generateTransactionId() {
  return crypto.randomBytes(16).toString("hex"); // Generates a 32-character hexadecimal string
}
exports.createPaymentDetails = async (req, res) => {
  try {
    const { userId, cartId, paymentId, paymentMethod, amount, paymentDetails } =
      req.body;

    // Validate required fields
    if (!userId || !cartId || !paymentMethod || !amount) {
      return res.status(400).json({
        message: "userId, cartId, paymentMethod, and amount are required",
      });
    }

    // Generate a new unique transaction ID
    const transactionId = generateTransactionId();

    // Check if the generated transactionId already exists
    const existingPayment = await PaymentDetails.findOne({ transactionId });
    if (existingPayment) {
      return res.status(400).json({
        message: "Duplicate transaction ID generated. Please try again.",
      });
    }

    // Create a new payment entry with all required fields
    const newPayment = new PaymentDetails({
      userId,
      cartId,
      paymentId,
      paymentMethod,
      transactionId, // New transaction ID
      amount, // New amount
      paymentDetails: paymentDetails || "", // Optional field
      paymentStatus: "Pending", // Initial payment status
    });

    // Save the payment details to the database
    const savedPayment = await newPayment.save();

    // Return the saved payment details in the response
    return res.status(201).json({
      message: "Payment details created successfully",
      payment: savedPayment, // Include the saved payment details in the response
    });
  } catch (error) {
    console.error("Error creating payment details:", error);
    return res.status(500).json({
      message: "Error creating payment details",
      error: error.message,
    });
  }
};
// 2. Get Payment Details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentDetails = await PaymentDetails.findById(paymentId);
    if (!paymentDetails)
      return res.status(404).json({ message: "Payment not found" });

    return res.status(200).json({ paymentDetails });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching payment details", error });
  }
};

exports.getPaymentDetailsByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Query the PaymentDetails collection using transactionId
    const paymentDetails = await PaymentDetails.findOne({ transactionId });

    if (!paymentDetails) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.status(200).json({ paymentDetails });
  } catch (error) {
    console.error("Error fetching payment details:", error.message);
    return res.status(500).json({
      message: "Error fetching payment details",
      error: error.message,
    });
  }
};

// 3. Update Payment Details
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, paymentMethod, amount } = req.body;

    const updatedPayment = await PaymentDetails.findByIdAndUpdate(
      paymentId,
      { status, paymentMethod, amount },
      { new: true }
    );

    if (!updatedPayment)
      return res.status(404).json({ message: "Payment not found" });

    return res.status(200).json({
      message: "Payment details updated successfully",
      updatedPayment,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating payment details", error });
  }
};
exports.paymentWebhook = async (req, res) => {
  try {
    console.log("Webhook triggered");

    let responseString = req.body.response || req.rawBody;

    if (!responseString) {
      return res.status(400).send("Missing payment response data.");
    }

    let decodedData;
    try {
      decodedData = Buffer.from(responseString, "base64").toString("utf-8");
      console.log("Decoded Data:", decodedData);
    } catch (error) {
      console.error("Base64 decode error:", error.message);
      return res.status(400).json({ message: "Failed to decode base64 data." });
    }

    // Parse JSON from the decoded data
    let paymentData;
    try {
      paymentData = JSON.parse(decodedData);
      console.log("Parsed Payment Data:", JSON.stringify(paymentData));
    } catch (error) {
      console.error("Invalid JSON in decoded data:", error.message);
      return res.status(400).json({ message: "Invalid JSON in decoded data." });
    }

    // Extract required fields with fallback for missing data
    const {
      merchantTransactionId,
      state,
      amount,
      paymentInstrument = {},
    } = paymentData.data || {};

    const paymentMethod = "Phonepe";

    if (!merchantTransactionId || !state || !amount) {
      console.error("Missing required payment data");
      return res.status(400).send("Invalid payment data.");
    }

    // Update payment details using merchantTransactionId (mapped to transactionId)
    const payment = await PaymentDetails.findOneAndUpdate(
      { transactionId: merchantTransactionId },
      {
        status: state === "COMPLETED" ? "Paid" : "Failed",
        paymentStatus: state === "COMPLETED" ? "Completed" : "Failed",
        amount,
        paymentMethod,
      },
      { new: true }
    );

    if (!payment) {
      console.error("Payment not found.");
      return res.status(404).json({ message: "Payment not found." });
    }

    console.log("Payment status updated:", payment);

    if (state === "COMPLETED") {
      // Get cart details to extract address information
      const Cart = require("../models/cartModel");
      const cart = await Cart.findById(payment.cartId);

      if (!cart) {
        console.error("Cart not found for order creation");
        return res.status(404).send("Cart not found for order creation.");
      }

      // Check if cart has address information
      if (!cart.address || !cart.address.street || !cart.address.city || !cart.address.state || !cart.address.pincode) {
        console.error("Cart does not have complete address information");
        return res.status(400).send("Cart does not have complete address information. Please update cart address before payment.");
      }

      // Use address from cart
      const address = {
        street: cart.address.street,
        city: cart.address.city,
        state: cart.address.state,
        pincode: cart.address.pincode,
        phoneNumber: cart.address.phoneNumber || ""
      };

      const orderRequest = {
        body: {
          userId: payment.userId,
          cartId: payment.cartId,
          paymentMethod: "Phonepe",
          address: address,
          notes: req.body.notes || `Payment completed via PhonePe - Transaction ID: ${merchantTransactionId}`,
        },
      };

      console.log("Creating order with request:", JSON.stringify(orderRequest, null, 2));

      try {
        await createOrder(orderRequest, res);
        // Note: createOrder already sends a response, so we don't send another one here
        return; // Exit early since createOrder handles the response
      } catch (error) {
        console.error("Error creating order:", error.message);
        return res.status(500).send("Error creating order.");
      }
    } else {
      console.log("Payment failed");
      return res.status(200).send("Payment status updated.");
    }
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    return res.status(500).send("Error processing webhook.");
  }
};
// Controller to get all payments with user name and cart total amount populated
exports.getAllPayments = async (req, res) => {
  try {
    // Fetch all payments, populate user name and cart total amount, and sort by most recent
    const payments = await PaymentDetails.find()
      .populate({
        path: "userId",
        select: "displayName", // Only fetch the displayName field from User
      })
      .populate({
        path: "cartId",
        select: "total_amount", // Only fetch the totalAmount field from Cart
      })
      .sort({ createdDate: -1 }); // Sort by createdAt in descending order (most recent first)

    if (!payments.length) {
      return res.status(404).json({ message: "No payments found" });
    }

    return res.status(200).json({ payments });
  } catch (error) {
    console.error("Error fetching all payments:", error.message);
    return res.status(500).json({
      message: "Error fetching all payments",
      error: error.message,
    });
  }
};

// Razorpay Payment Initiation
exports.initiateRazorpayPayment = async (req, res) => {
  try {
    const { userId, cartId, amount, currency = "INR", notes = {} } = req.body;

    // Validate required fields
    if (!userId || !cartId || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId, cartId, and amount are required",
      });
    }

    // Validate cart exists
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Generate transaction ID
    const transactionId = generateTransactionId();

    // Check if transactionId already exists
    const existingPayment = await PaymentDetails.findOne({ transactionId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Duplicate transaction ID generated. Please try again.",
      });
    }

    // Create Razorpay order
    // Receipt must be max 40 characters - use timestamp + short transactionId prefix
    const receipt = `rcpt_${Date.now()}${transactionId.substring(0, 8)}`;
    const orderData = {
      amount: parseFloat(amount),
      currency: currency,
      receipt: receipt,
      notes: {
        userId: userId.toString(),
        cartId: cartId.toString(),
        transactionId: transactionId,
        ...notes,
      },
    };

    const razorpayOrder = await RazorpayService.createOrder(orderData);

    if (!razorpayOrder.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to create Razorpay order",
        error: razorpayOrder.message,
      });
    }

    // Create payment record in database
    const newPayment = new PaymentDetails({
      userId,
      cartId,
      paymentMethod: "razorpay",
      transactionId: transactionId,
      orderId: razorpayOrder.data.orderId,
      paymentId: razorpayOrder.data.orderId, // Razorpay order ID
      amount: parseFloat(amount),
      currency: currency,
      paymentStatus: "Initiated",
      status: "initiated",
      paymentOptions: {
        razorpayOrderId: razorpayOrder.data.orderId,
        receipt: receipt,
      },
      notes: JSON.stringify(notes),
    });

    await newPayment.save();

    // Return Razorpay order details for client-side integration
    return res.status(200).json({
      success: true,
      message: "Razorpay payment initiated successfully",
      data: {
        orderId: razorpayOrder.data.orderId,
        amount: razorpayOrder.data.amount,
        currency: razorpayOrder.data.currency,
        receipt: razorpayOrder.data.receipt,
        key: process.env.RAZORPAY_KEY_ID,
        transactionId: transactionId,
        paymentId: newPayment._id,
      },
    });
  } catch (error) {
    console.error("Error initiating Razorpay payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error initiating Razorpay payment",
      error: error.message,
    });
  }
};

// Razorpay Webhook Handler

// Razorpay Webhook Handler
exports.razorpayWebhook = async (req, res) => {
  try {
    console.log("🔔 Razorpay Webhook triggered");
    console.log("Webhook payload:", JSON.stringify(req.body, null, 2));
    console.log("📋 Request Headers:", JSON.stringify(req.headers, null, 2));

    // Express normalizes headers to lowercase, but check multiple formats for robustness
    const webhookSignature = 
      req.headers["x-razorpay-signature"] || 
      req.headers["X-Razorpay-Signature"] ||
      req.headers["X-RAZORPAY-SIGNATURE"];
    
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSignature) {
      console.error("❌ Missing Razorpay webhook signature");
      console.error("Available headers:", Object.keys(req.headers));
      console.error("Looking for: x-razorpay-signature (case-insensitive)");
      // Return 200 to acknowledge receipt and prevent Razorpay from retrying
      return res.status(200).json({
        success: false,
        message: "Missing webhook signature",
        debug: {
          availableHeaders: Object.keys(req.headers),
          expectedHeader: "x-razorpay-signature"
        }
      });
    }

    // Verify webhook signature using raw body if available, otherwise use stringified body
    const crypto = require("crypto");
    const body = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      console.error("❌ Invalid Razorpay webhook signature");
      console.error("Expected:", expectedSignature);
      console.error("Received:", webhookSignature);
      // Return 200 to acknowledge receipt and prevent Razorpay from retrying
      return res.status(200).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    console.log("✅ Webhook signature verified");

    // Process webhook event
    const webhookData = RazorpayService.handleWebhook(req.body);

    if (!webhookData.success) {
      console.error("❌ Failed to handle webhook:", webhookData.message);
      // Return 200 to acknowledge receipt
      return res.status(200).json({
        success: false,
        message: webhookData.message,
      });
    }

    const { event, data } = webhookData;

    console.log(`📦 Processing Razorpay event: ${event}`);
    console.log("Event data:", JSON.stringify(data, null, 2));

    // Handle different webhook events (support both formats: payment_captured and payment.captured)
    if (
      event === "payment_captured" ||
      event === "payment.captured" ||
      event === "order_paid" ||
      event === "order.paid"
    ) {
      const razorpayOrderId = data.orderId;
      const razorpayPaymentId = data.paymentId || data.orderId; // Fallback to orderId if paymentId not available
      const amount = data.amount / 100; // Convert from paise to rupees
      const status = data.status || (event.includes("paid") ? "paid" : "captured");

      console.log(`💰 Payment captured for order: ${razorpayOrderId}`);
      console.log(`💳 Payment ID: ${razorpayPaymentId}`);
      console.log(`💵 Amount: ₹${amount}`);

      // Find payment record by Razorpay order ID
      let payment = await PaymentDetails.findOne({
        orderId: razorpayOrderId,
        paymentMethod: "razorpay",
      });

      // If not found, try to find by paymentId
      if (!payment) {
        payment = await PaymentDetails.findOne({
          paymentId: razorpayOrderId,
          paymentMethod: "razorpay",
        });
      }

      // If payment not found in PaymentDetails, check for StylistBooking
      if (!payment) {
        console.log(`🔍 Payment not found in PaymentDetails, checking StylistBooking...`);
        const stylistBooking = await StylistBooking.findOne({
          razorpayOrderId: razorpayOrderId
        }).populate('userId stylistId');

        if (stylistBooking) {
          console.log(`✅ Stylist booking found: ${stylistBooking._id}`);
          
          // Update stylist booking payment status
          stylistBooking.razorpayPaymentId = razorpayPaymentId;
          stylistBooking.paymentStatus = status === "captured" || status === "paid" ? "completed" : "failed";
          stylistBooking.status = status === "captured" || status === "paid" ? "confirmed" : stylistBooking.status;
          stylistBooking.paymentCompletedAt = status === "captured" || status === "paid" ? new Date() : null;
          stylistBooking.updatedAt = new Date();

          await stylistBooking.save();

          console.log("✅ Stylist booking payment status updated:", {
            bookingId: stylistBooking._id,
            paymentStatus: stylistBooking.paymentStatus,
            bookingStatus: stylistBooking.status,
          });

          // Send notifications if payment successful
          if (status === "captured" || status === "paid") {
            try {
              // Notify user
              const userNotification = {
                userId: stylistBooking.userId._id,
                title: "Booking Confirmed",
                message: `Your booking with ${stylistBooking.stylistId?.stylistName || 'stylist'} has been confirmed.`,
                type: "booking_confirmed",
                data: {
                  bookingId: stylistBooking._id,
                  stylistName: stylistBooking.stylistId?.stylistName,
                  scheduledDate: stylistBooking.scheduledDate,
                  scheduledTime: stylistBooking.scheduledTime
                }
              };

              await createNotification(userNotification);
              if (stylistBooking.userId.fcmToken) {
                await sendFcmNotification(
                  stylistBooking.userId.fcmToken,
                  userNotification.title,
                  userNotification.message
                );
              }

              // Notify stylist
              if (stylistBooking.stylistId?.userId) {
                const stylistNotification = {
                  userId: stylistBooking.stylistId.userId,
                  title: "New Booking Received",
                  message: `You have a new booking from ${stylistBooking.userId.displayName || 'customer'}.`,
                  type: "new_booking_received",
                  data: {
                    bookingId: stylistBooking._id,
                    userName: stylistBooking.userId.displayName,
                    scheduledDate: stylistBooking.scheduledDate,
                    scheduledTime: stylistBooking.scheduledTime
                  }
                };

                await createNotification(stylistNotification);
              }
            } catch (notificationError) {
              console.error("❌ Notification error:", notificationError);
            }
          }

          return res.status(200).json({
            success: true,
            message: "Stylist booking payment processed successfully",
            data: {
              bookingId: stylistBooking._id,
              paymentStatus: stylistBooking.paymentStatus,
              bookingStatus: stylistBooking.status,
              paymentId: razorpayPaymentId,
            },
          });
        }

        console.error(`❌ Payment record not found for Razorpay order: ${razorpayOrderId}`);
        // Return 200 to acknowledge receipt even if payment not found
        return res.status(200).json({
          success: false,
          message: "Payment record not found",
          razorpayOrderId: razorpayOrderId,
        });
      }

      // Update payment status
      const updateData = {
        paymentStatus: status === "captured" || status === "paid" ? "Completed" : "Failed",
        status: status === "captured" || status === "paid" ? "completed" : "failed",
        completedAt: status === "captured" || status === "paid" ? new Date() : null,
        updatedAt: new Date(),
      };

      // Only update paymentId if it's different from orderId (i.e., we have an actual payment ID)
      if (razorpayPaymentId && razorpayPaymentId !== razorpayOrderId) {
        updateData.paymentId = razorpayPaymentId;
      }

      payment = await PaymentDetails.findByIdAndUpdate(
        payment._id,
        { $set: updateData },
        { new: true }
      );

      console.log("✅ Payment status updated:", {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        status: payment.status,
        paymentStatus: payment.paymentStatus,
      });

      // Create order if payment is successful
      if (status === "captured" || status === "paid") {
        console.log("🎉 Payment successful, creating order...");
        console.log("📋 Payment Details:", {
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          amount: amount,
          userId: payment.userId.toString(),
          cartId: payment.cartId.toString(),
          transactionId: payment.transactionId,
        });

        // Get cart details to extract address information
        const cart = await Cart.findById(payment.cartId);

        if (!cart) {
          console.error("❌ Cart not found for order creation");
          console.error("Cart ID:", payment.cartId);
          // Return 200 to acknowledge receipt, but log the error
          return res.status(200).json({
            success: false,
            message: "Cart not found for order creation",
            cartId: payment.cartId,
          });
        }

        console.log("✅ Cart found:", {
          cartId: cart._id.toString(),
          totalAmount: cart.total_amount,
          productCount: cart.products.length,
        });

        // Check if cart has address information
        if (
          !cart.address ||
          !cart.address.street ||
          !cart.address.city ||
          !cart.address.state ||
          !cart.address.pincode
        ) {
          console.error("❌ Cart does not have complete address information");
          console.error("Cart address:", cart.address);
          // Return 200 to acknowledge receipt, but log the error
          return res.status(200).json({
            success: false,
            message:
              "Cart does not have complete address information. Please update cart address before payment.",
            cartId: cart._id,
          });
        }

        // Use address from cart
        const address = {
          street: cart.address.street,
          city: cart.address.city,
          state: cart.address.state,
          pincode: cart.address.pincode,
          phoneNumber: cart.address.phoneNumber || "",
        };

        console.log("📍 Shipping Address:", address);

        const orderRequest = {
          body: {
            userId: payment.userId,
            cartId: payment.cartId,
            paymentMethod: "Razorpay",
            address: address,
            notes: `Payment completed via Razorpay - Payment ID: ${razorpayPaymentId}, Order ID: ${razorpayOrderId}`,
          },
        };

        console.log("🛒 Creating order from Razorpay webhook...");
        console.log("📦 Order Request:", {
          userId: orderRequest.body.userId.toString(),
          cartId: orderRequest.body.cartId.toString(),
          paymentMethod: orderRequest.body.paymentMethod,
          address: orderRequest.body.address,
          notes: orderRequest.body.notes,
        });

        try {
          console.log("⏳ Calling createOrder function...");
          await createOrder(orderRequest, res);
          console.log("✅ Order created successfully from Razorpay webhook!");
          console.log("📝 Order Details:", {
            userId: payment.userId.toString(),
            cartId: payment.cartId.toString(),
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            amount: amount,
            paymentMethod: "Razorpay",
          });
          // Note: createOrder already sends a response, so we don't send another one here
          return; // Exit early since createOrder handles the response
        } catch (error) {
          console.error("❌ Error creating order from Razorpay webhook:", error);
          console.error("❌ Error details:", {
            message: error.message,
            stack: error.stack,
            userId: payment.userId.toString(),
            cartId: payment.cartId.toString(),
          });
          // Return 200 to acknowledge receipt, but log the error
          return res.status(200).json({
            success: false,
            message: "Error creating order",
            error: error.message,
            paymentId: payment._id,
          });
        }
      } else {
        console.log("❌ Payment failed");
        return res.status(200).json({
          success: true,
          message: "Payment status updated",
          data: {
            paymentId: payment._id,
            status: payment.status,
          },
        });
      }
    } else if (event === "payment_failed" || event === "payment.failed") {
      console.log("❌ Payment failed event received");

      const razorpayOrderId = data.orderId;
      const razorpayPaymentId = data.paymentId;

      // Find and update payment record
      let payment = await PaymentDetails.findOne({
        $or: [
          { orderId: razorpayOrderId, paymentMethod: "razorpay" },
          { paymentId: razorpayOrderId, paymentMethod: "razorpay" },
        ],
      });

      if (payment) {
        payment = await PaymentDetails.findByIdAndUpdate(
          payment._id,
          {
            $set: {
              paymentId: razorpayPaymentId,
              paymentStatus: "Failed",
              status: "failed",
              failedAt: new Date(),
              failureReason: data.errorDescription || "Payment failed",
              updatedAt: new Date(),
            },
          },
          { new: true }
        );

        console.log("✅ Payment failure recorded:", {
          paymentId: payment._id,
          status: payment.status,
        });
      } else {
        // Check for stylist booking
        const stylistBooking = await StylistBooking.findOne({
          razorpayOrderId: razorpayOrderId
        });

        if (stylistBooking) {
          stylistBooking.paymentStatus = "failed";
          stylistBooking.razorpayPaymentId = razorpayPaymentId;
          stylistBooking.updatedAt = new Date();
          await stylistBooking.save();

          console.log("✅ Stylist booking payment failure recorded:", {
            bookingId: stylistBooking._id,
            paymentStatus: stylistBooking.paymentStatus,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment failure recorded",
      });
    } else {
      console.log(`ℹ️ Unhandled webhook event: ${event}`);
      return res.status(200).json({
        success: true,
        message: "Webhook received but event not processed",
        event: event,
      });
    }
  } catch (error) {
    console.error("❌ Error processing Razorpay webhook:", error);
    // Return 200 to acknowledge receipt and prevent Razorpay from retrying
    return res.status(200).json({
      success: false,
      message: "Error processing webhook",
      error: error.message,
    });
  }
};

