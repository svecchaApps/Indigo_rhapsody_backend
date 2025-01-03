const mongoose = require("mongoose");

const videoModel = {
  videoUrl: [
    {
      type: String,
      // required: true,
    },
  ],
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      type: String,
    },
  ],
  likes: {
    type: Number,
    default: 0,
  },
  is_approved: {
    type: Boolean,
    default: false,
  },
  demo_url: {
    type: String,
  },
  instagram_User: {
    type: String,
  },
};

module.exports = mongoose.model("Video", videoModel);
