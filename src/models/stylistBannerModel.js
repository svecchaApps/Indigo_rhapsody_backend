const mongoose = require("mongoose");

const stylistBannerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
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

  // Stylist Relationship
  linkedStylist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StylistProfile",
  },
  linkedStylistCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StylistCategory",
  },

  // Page/Position
  position: {
    type: String,
    enum: [
      "stylist_home",
      "stylist_listing",
      "stylist_profile",
      "stylist_category",
      "stylist_search",
      "stylist_top",
      "custom",
    ],
    required: true,
    default: "stylist_home",
  },
  customPosition: {
    type: String,
    default: "",
  },

  // Link/Action
  actionType: {
    type: String,
    enum: ["none", "url", "stylist", "stylist_category", "page"],
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
    default: "Book Now",
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
stylistBannerSchema.index({ position: 1, isActive: 1, displayOrder: 1 });
stylistBannerSchema.index({ platform: 1, isActive: 1 });
stylistBannerSchema.index({ startDate: 1, endDate: 1 });
stylistBannerSchema.index({ linkedStylist: 1 });
stylistBannerSchema.index({ linkedStylistCategory: 1 });

// Virtual for checking if banner is currently active based on dates
stylistBannerSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  const isDateValid =
    (!this.startDate || this.startDate <= now) &&
    (!this.endDate || this.endDate >= now);
  return this.isActive && isDateValid;
});

module.exports = mongoose.model("StylistBanner", stylistBannerSchema);

