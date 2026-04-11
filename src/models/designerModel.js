const mongoose = require("mongoose");

const designerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  comission_total:{
    type: Number,
    default: 0,
  },

  status: {
    type: Boolean,
    default: true,
  },
  logoUrl: {
    type: String,
    required: true,
  },
  backGroundImage: {
    type: String,
    // required: true,
  },
  store_banner_web: {
    type: String,
  },
  is_approved: {
    type: Boolean,
    default: false,
  },
  shortDescription: {
    type: String,
  },
  about: {
    type: String,
  },
  product_sample_images: [
    {
      type: String,
    },
  ],
  createdTime: {
    type: Date,
    default: Date.now,
  },
  updatedTime: {
    type: Date,
    default: Date.now,
  },
  pickup_location_name: {
    type: String,
  },
});

exports = module.exports = mongoose.model("Designer", designerSchema);
