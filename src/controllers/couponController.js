const Coupon = require("../models/couponsModel");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const {
  validateCoupon,
  hasUserUsedCoupon,
  markCouponAsUsed,
} = require("../utils/couponUtils");

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const { couponCode, couponAmount, expiryDate } = req.body;
    const coupon = new Coupon({
      couponCode,
      couponAmount,
      expiryDate,
    });

    const savedCoupon = await coupon.save();
    res.status(201).json(savedCoupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCouponStatus = async () => {
  try {
    const currentDate = new Date();
    const expiredCoupons = await Coupon.find({
      expiryDate: { $lt: currentDate }, // Find coupons where expiryDate is less than currentDate
      is_active: true, // Only update active coupons
    });

    if (expiredCoupons.length > 0) {
      console.log(
        `Found ${expiredCoupons.length} expired coupons. Updating status...`
      );
      await Promise.all(
        expiredCoupons.map(async (coupon) => {
          coupon.is_active = false;
          await coupon.save();
        })
      );
      console.log("Expired coupons updated successfully.");
    } else {
      console.log("No expired coupons found.");
    }
  } catch (error) {
    console.error("Error updating coupon status:", error);
  }
};

updateCouponStatus(); // Run on server start
setInterval(updateCouponStatus, 60 * 60 * 1000);

// Update an existing coupon by ID
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(updatedCoupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a coupon by ID
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific coupon by code
exports.getCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ couponCode: code });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getAllCoupons = async (req, res) => {
  try {
    // Fetch all coupons from the database
    const coupons = await Coupon.find();

    // Check if coupons exist
    if (!coupons.length) {
      return res.status(404).json({ message: "No coupons found" });
    }

    // Respond with the fetched coupons
    res.status(200).json({
      message: "Coupons fetched successfully",
      data: coupons,
    });
  } catch (error) {
    // Handle errors and respond with an error message
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

// Get a coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get coupons by user (optional logic if you want user-specific filtering)
exports.getCouponsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const coupons = await Coupon.find({ userId });

    if (!coupons.length) {
      return res
        .status(404)
        .json({ message: "No coupons found for this user" });
    }

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { userId, couponCode } = req.body;

    // Find the coupon by code
    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Check if the coupon is still active and not expired
    if (!coupon.is_active || coupon.expiryDate < new Date()) {
      return res.status(400).json({ message: "Coupon is expired or inactive" });
    }

    // Check if the user has already used this coupon
    if (coupon.usedBy.includes(userId)) {
      return res.status(403).json({
        message: "You have already used this coupon",
      });
    }

    coupon.usedBy.push(userId); // Add user to usedBy list
    await coupon.save();

    res.status(200).json({
      message: "Coupon applied successfully",
      discount: coupon.couponAmount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.applyCouponToCart = async (req, res) => {
  try {
    const { cartId, couponId, userId } = req.body; // Changed from couponCode to couponId

    // Validate the coupon by ID
    const coupon = await Coupon.findById(couponId); // Fetch coupon using couponId
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" }); // Handle coupon not found case
    }

    console.log("Coupon Validated:", coupon);

    // Check if the user has already used this coupon
    const used = hasUserUsedCoupon(coupon, userId);
    if (used) {
      return res
        .status(403)
        .json({ message: "You have already used this coupon" });
    }

    // Find the cart by ID
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Check if a discount is already applied to the cart
    if (cart.discount_applied) {
      return res
        .status(400)
        .json({ message: "A coupon is already applied to this cart" });
    }

    // Calculate new totals
    const subtotal = cart.products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    );
    const discountAmount = coupon.couponAmount;
    const totalAmount =
      subtotal - discountAmount + cart.shipping_cost + cart.tax_amount;

    // Update cart details
    cart.subtotal = roundToTwoDecimals(subtotal);
    cart.discount_applied = true;
    cart.discount_amount = roundToTwoDecimals(discountAmount);
    cart.total_amount = roundToTwoDecimals(totalAmount);

    // Save the cart
    await cart.save();

    // Mark the coupon as used by this user
    await markCouponAsUsed(coupon, userId);
    console.log("Coupon marked as used for user:", userId);

    res.status(200).json({
      message: "Coupon applied successfully",
      cart,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      is_active: true,
      expiryDate: { $gte: now },
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      message: "Active coupons fetched successfully",
      data: coupons,
      count: coupons.length,
    });
  } catch (error) {
    console.error("Error fetching active coupons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active coupons",
      error: error.message,
    });
  }
};

exports.createCouponForPromotion = async (req, res) => {
  try {
    const { couponCode, couponAmount, expiryDate, maxUsage } = req.body;

    // Validate required fields
    if (!couponCode || !couponAmount || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "couponCode, couponAmount and expiryDate are required",
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ couponCode });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    // Validate expiry date
    const expiry = new Date(expiryDate);
    if (expiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    // Create the coupon
    const coupon = new Coupon({
      couponCode,
      couponAmount,
      created_for_promotion: {
        created_at: new Date(),
        no_of_max_usage: maxUsage || 1, // Default to single use if not specified
      },
      expiryDate: expiry,
      is_active: true,
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: "Promotion coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Error creating promotion coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.createCouponForParticularUser = async (req, res) => {
  try {
    const { userId, couponCode, couponAmount, expiryDate } = req.body;

    // Validate required fields
    if (!userId || !couponCode || !couponAmount || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "userId, couponCode, couponAmount and expiryDate are required",
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ couponCode });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate expiry date
    const expiry = new Date(expiryDate);
    if (expiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    // Create the coupon
    const coupon = new Coupon({
      couponCode,
      couponAmount,
      created_for: [
        {
          user_id: userId,
          expired_in: expiry,
          is_used: false,
        },
      ],
      expiryDate: expiry,
      is_active: true,
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: "User-specific coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Error creating user-specific coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.applyCouponUniversal = async (req, res) => {
  try {
    const { userId, couponCode, cartId } = req.body;

    /* ─── basic arg check ──────────────────────────────────────────────── */
    if (!userId || !couponCode || !cartId)
      return res.status(400).json({
        success: false,
        message: "userId, couponCode, and cartId are required",
      });

    /* ─── look-up coupon ──────────────────────────────────────────────── */
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon)
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });

    if (!coupon.is_active)
      return res
        .status(400)
        .json({ success: false, message: "Coupon is not active" });

    if (coupon.expiryDate < Date.now())
      return res
        .status(400)
        .json({ success: false, message: "Coupon has expired" });

    /* ─── usage checks (global & per-user) ────────────────────────────── */
    if (coupon.usedBy.includes(userId))
      return res
        .status(400)
        .json({ success: false, message: "You have already used this coupon" });

    if (coupon.created_for?.length) {
      const rec = coupon.created_for.find(
        (u) => u.user_id.toString() === userId
      );
      if (!rec)
        return res.status(403).json({
          success: false,
          message: "Coupon not valid for this account",
        });
      if (rec.is_used)
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon",
        });
    } else if (coupon.created_for_promotion) {
      if (coupon.usedBy.length >= coupon.created_for_promotion.no_of_max_usage)
        return res
          .status(400)
          .json({ success: false, message: "Coupon usage limit reached" });
    }

    /* ─── fetch cart & basic validations ──────────────────────────────── */
    const cart = await Cart.findById(cartId);
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });

    if (cart.discount_applied)
      return res.status(400).json({
        success: false,
        message: "A coupon is already applied to this cart",
      });

    /* ─── compute subtotal & discount ─────────────────────────────────── */
    const subtotal = cart.products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discount = Math.min(coupon.couponAmount, subtotal); // never exceed subtotal
    const total =
      subtotal - discount + (cart.shipping_cost || 0) + (cart.tax_amount || 0);

    /* ─── update cart ─────────────────────────────────────────────────── */
    cart.subtotal = round2(subtotal);
    cart.discount_amount = round2(discount);
    cart.discount_applied = true;
    cart.total_amount = round2(total);
    cart.lastUpdatedDate = new Date();
    cart.expirationDate = coupon.expiryDate; // optional: expire cart with coupon

    /* ─── mark coupon used ────────────────────────────────────────────── */
    coupon.usedBy.push(userId);
    if (coupon.created_for?.length) {
      const idx = coupon.created_for.findIndex(
        (u) => u.user_id.toString() === userId
      );
      if (idx !== -1) coupon.created_for[idx].is_used = true;
    }

    /* ─── persist both docs at once ───────────────────────────────────── */
    await Promise.all([cart.save(), coupon.save()]);

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        cart,
        discountApplied: cart.discount_amount,
        newTotal: cart.total_amount,
      },
    });
  } catch (err) {
    console.error("applyCouponUniversal ►", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query parameter 'q' is required",
      });
    }

    // Create a case-insensitive regex for searching
    const searchRegex = new RegExp(q, "i");

    const users = await User.find({
      $or: [
        { email: searchRegex },
        { displayName: searchRegex },
        { phoneNumber: isNaN(q) ? null : Number(q) }, // Only search by number if q is numeric
      ],
    })
      .select("-password -__v") // Exclude sensitive/uneeded fields
      .limit(10); // Limit results to 10

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
