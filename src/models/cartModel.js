const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      designerRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designer",
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1,
      },
      size: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
      is_customizable: {
        type: Boolean,
        default: false,
      },
      customizations: {
        type: String,
      },
      discount: {
        type: Number,
        default: 0,
      },
      image: {
        type: String,
      },
    },
  ],
  subtotal: {
    type: Number,
    default: 0,
  },
  total_amount: {
    type: Number,
    default: 0,
  },
  discount_applied: {
    type: Boolean,
    default: false,
  },
  discount_amount: {
    type: Number,
    default: 0,
  },
  tax_amount: {
    type: Number,
    default: 0,
  },
  shipping_cost: {
    type: Number,
    default: 0,
  },
  shipping_method: {
    type: String,
  },
  address: {
    street: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    country: {
      type: String,
      default: "India",
    },
    phoneNumber: {
      type: String,
    },
  },
  status: {
    type: String,
    enum: ["active", "completed", "abandoned"],
    default: "active",
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedDate: {
    type: Date,
    default: Date.now,
  },
  // Coupon applied reference and timestamps
  appliedCoupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
  },
  couponAppliedAt: {
    type: Date,
  },
  // Hold expiry for the applied coupon (1 day hold window)
  couponHoldExpiry: {
    type: Date,
  },
  expirationDate: {
    type: Date,
  },
});

// Update the last updated date before saving
cartSchema.pre("save", function (next) {
  this.lastUpdatedDate = new Date();
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
