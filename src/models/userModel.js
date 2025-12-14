const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false, // Optional for phone-based auth
  },
  displayName: {
    type: String,
    required: true,
  },
  createdTime: {
    type: Date,
    default: Date.now,
  },
  phoneNumber: {
    type: String, // Changed to String to support international format
    required: false, // Optional - at least email or phoneNumber should be provided
    unique: true,
    sparse: true, // Allows multiple null/undefined values for unique constraint
  },
  firebaseUid: {
    type: String,
    required: false, // Will be set after Firebase verification
  },
  password: {
    type: String,
    required: false, // Optional for phone-based auth
  },
  role: {
    type: String,
    enum: ["Designer", "User", "Admin", "Stylist"],
    default: "User",
  },
  is_creator: {
    type: Boolean,
    default: false,
  },

  last_logged_in: {
    type: Date,
    default: Date.now,
  },
  
  fcmToken: {
    type: String,
    required: false,
  },
  address: [
    {
      nick_name: {
        type: String,
      },
      city: {
        type: String,
      },
      pincode: {
        type: Number,
      },
      state: {
        type: String,
      },
      street_details: {
        type: String,
      },
    },
  ],
  recentlyViewedProducts: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);

