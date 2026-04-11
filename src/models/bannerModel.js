const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    // required: true,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
    default: "",
  },
  subtitle: {
    type: String,
    trim: true,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },

  // Platform Specific
  platform: {
    type: String,
    enum: ["web", "mobile", "both"],
    default: "both",
    required: true,
  },

  // Images for different platforms
  images: {
    web: {
      desktop: {
        type: String,
        default: "",
      },
      tablet: {
        type: String,
        default: "",
      },
    },
    mobile: {
      type: String,
      default: "",
    },
  },

  // Legacy support
  image: {
    type: String,
    default: "",
  },

  // Page Relationship
  page: {
    type: String,
    enum: [
      "home",
      "products",
      "categories",
      "designers",
      "about",
      "contact",
      "checkout",
      "profile",
      "cart",
      "wishlist",
      "orders",
      "custom",
    ],
    required: true,
    default: "home",
  },
  customPage: {
    type: String,
    default: "",
  },

  // Link/Action
  actionType: {
    type: String,
    enum: ["none", "url", "product", "category", "designer", "page"],
    default: "none",
  },
  actionValue: {
    type: String,
    default: "",
  },
  actionUrl: {
    type: String,
    default: "",
  },

  // References for linking
  linkedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  linkedCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  linkedDesigner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designer",
  },

  // Display Settings
  displayOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  // Scheduling
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },

  // Button/CTA
  buttonText: {
    type: String,
    default: "Shop Now",
  },
  buttonColor: {
    type: String,
    default: "#000000",
  },
  textColor: {
    type: String,
    default: "#FFFFFF",
  },

  // Analytics
  clickCount: {
    type: Number,
    default: 0,
  },
  impressionCount: {
    type: Number,
    default: 0,
  },

  // Metadata
  tags: [
    {
      type: String,
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  updatedDate: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better query performance
bannerSchema.index({ page: 1, isActive: 1, displayOrder: 1 });
bannerSchema.index({ platform: 1, isActive: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if banner is currently active based on dates
bannerSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  const isDateValid =
    (!this.startDate || this.startDate <= now) &&
    (!this.endDate || this.endDate >= now);
  return this.isActive && isDateValid;
});

module.exports = mongoose.model("Banner", bannerSchema);
