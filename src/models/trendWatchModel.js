const mongoose = require("mongoose");

const trendWatchSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  bigImage: {
    type: String,
    required: true,
    default: "",
  },
  smallImages: [
    {
      type: String,
    },
  ],
  // 3-4 products selected by admin
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  // Products for "Complete the Look" section
  completeLookProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  displayOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
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

trendWatchSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model("TrendWatch", trendWatchSchema);
