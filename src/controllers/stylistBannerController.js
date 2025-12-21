const mongoose = require("mongoose");
const StylistBanner = require("../models/stylistBannerModel");
const StylistProfile = require("../models/stylistProfile");
const StylistCategory = require("../models/stylistCategoryModel");
const { bucket } = require("../service/firebaseServices");

// Helper function to upload banner image to Firebase Storage
const uploadStylistBannerImage = async (file, folder = "stylist-banners") => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const fileName = `${folder}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on("error", (error) => {
      console.error("Error uploading file:", error);
      reject(error);
    });

    stream.on("finish", async () => {
      try {
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      } catch (error) {
        console.error("Error making file public:", error);
        reject(error);
      }
    });

    stream.end(file.buffer);
  });
};

// Create Stylist Banner
exports.createStylistBanner = async (req, res) => {
  try {
    const {
      name,
      title,
      subtitle,
      description,
      platform,
      position,
      customPosition,
      actionType,
      actionValue,
      actionUrl,
      linkedStylist,
      linkedStylistCategory,
      displayOrder,
      isActive,
      startDate,
      endDate,
      buttonText,
      buttonColor,
      textColor,
      tags,
      imageUrl,
      webDesktopUrl,
      webTabletUrl,
      mobileUrl,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Banner name is required",
      });
    }

    // Validate linked stylist if provided
    if (linkedStylist && !mongoose.Types.ObjectId.isValid(linkedStylist)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stylist ID format",
      });
    }

    // Validate linked category if provided
    if (linkedStylistCategory && !mongoose.Types.ObjectId.isValid(linkedStylistCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stylist category ID format",
      });
    }

    // Build images object
    const images = {
      web: {
        desktop: webDesktopUrl || "",
        tablet: webTabletUrl || "",
      },
      mobile: mobileUrl || "",
    };

    // Create banner data
    const bannerData = {
      name,
      title: title || "",
      subtitle: subtitle || "",
      description: description || "",
      platform: platform || "both",
      position: position || "stylist_home",
      customPosition: customPosition || "",
      actionType: actionType || "none",
      actionValue: actionValue || "",
      actionUrl: actionUrl || "",
      linkedStylist: linkedStylist || null,
      linkedStylistCategory: linkedStylistCategory || null,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate || null,
      endDate: endDate || null,
      buttonText: buttonText || "Book Now",
      buttonColor: buttonColor || "#000000",
      textColor: textColor || "#FFFFFF",
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(",")) : [],
      images,
      image: imageUrl || webDesktopUrl || mobileUrl || "",
      createdBy: req.user?.id || req.user?._id || null,
      updatedBy: req.user?.id || req.user?._id || null,
      createdDate: new Date(),
      updatedDate: new Date(),
    };

    const banner = new StylistBanner(bannerData);
    await banner.save();

    // Populate references
    await banner.populate("linkedStylist", "stylistName stylistImage stylistCity");
    await banner.populate("linkedStylistCategory", "name description image");

    res.status(201).json({
      success: true,
      message: "Stylist banner created successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Error creating stylist banner:", error);
    res.status(500).json({
      success: false,
      message: "Error creating stylist banner",
      error: error.message,
    });
  }
};

// Get All Stylist Banners (with filters)
exports.getStylistBanners = async (req, res) => {
  try {
    const {
      position,
      platform,
      isActive,
      linkedStylist,
      linkedStylistCategory,
      page = 1,
      limit = 10,
      sortBy = "displayOrder",
      sortOrder = "asc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = {};

    if (position) {
      query.position = position;
    }

    if (platform) {
      query.platform = { $in: [platform, "both"] };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    if (linkedStylist && mongoose.Types.ObjectId.isValid(linkedStylist)) {
      query.linkedStylist = linkedStylist;
    }

    if (linkedStylistCategory && mongoose.Types.ObjectId.isValid(linkedStylistCategory)) {
      query.linkedStylistCategory = linkedStylistCategory;
    }

    // Date filtering - only show active banners within date range
    const now = new Date();
    query.$or = [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: { $gte: now } },
    ];

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const banners = await StylistBanner.find(query)
      .populate("linkedStylist", "stylistName stylistImage stylistCity stylistState")
      .populate("linkedStylistCategory", "name description image icon")
      .populate("createdBy", "displayName email")
      .populate("updatedBy", "displayName email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalBanners = await StylistBanner.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Stylist banners retrieved successfully",
      data: {
        banners,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalBanners / parseInt(limit)),
          totalBanners,
          hasNextPage: skip + banners.length < totalBanners,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting stylist banners:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving stylist banners",
      error: error.message,
    });
  }
};

// Get Stylist Banners by Position
exports.getStylistBannersByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    const { platform } = req.query;

    let query = {
      position,
      isActive: true,
    };

    if (platform) {
      query.platform = { $in: [platform, "both"] };
    }

    // Date filtering
    const now = new Date();
    query.$or = [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: { $gte: now } },
    ];

    const banners = await StylistBanner.find(query)
      .populate("linkedStylist", "stylistName stylistImage stylistCity stylistState")
      .populate("linkedStylistCategory", "name description image icon")
      .sort({ displayOrder: 1, createdDate: -1 });

    res.status(200).json({
      success: true,
      message: `Stylist banners for position '${position}' retrieved successfully`,
      data: {
        position,
        banners,
        count: banners.length,
      },
    });
  } catch (error) {
    console.error("Error getting stylist banners by position:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving stylist banners by position",
      error: error.message,
    });
  }
};

// Get Stylist Banner by ID
exports.getStylistBannerById = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await StylistBanner.findById(bannerId)
      .populate("linkedStylist", "stylistName stylistImage stylistCity stylistState stylistBio")
      .populate("linkedStylistCategory", "name description image icon")
      .populate("createdBy", "displayName email")
      .populate("updatedBy", "displayName email");

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stylist banner retrieved successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Error getting stylist banner:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving stylist banner",
      error: error.message,
    });
  }
};

// Update Stylist Banner
exports.updateStylistBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const {
      name,
      title,
      subtitle,
      description,
      platform,
      position,
      customPosition,
      actionType,
      actionValue,
      actionUrl,
      linkedStylist,
      linkedStylistCategory,
      displayOrder,
      isActive,
      startDate,
      endDate,
      buttonText,
      buttonColor,
      textColor,
      tags,
      imageUrl,
      webDesktopUrl,
      webTabletUrl,
      mobileUrl,
    } = req.body;

    const updateData = {
      updatedBy: req.user?.id || req.user?._id || null,
      updatedDate: new Date(),
    };

    // Update only provided fields
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (description !== undefined) updateData.description = description;
    if (platform !== undefined) updateData.platform = platform;
    if (position !== undefined) updateData.position = position;
    if (customPosition !== undefined) updateData.customPosition = customPosition;
    if (actionType !== undefined) updateData.actionType = actionType;
    if (actionValue !== undefined) updateData.actionValue = actionValue;
    if (actionUrl !== undefined) updateData.actionUrl = actionUrl;
    if (linkedStylist !== undefined) updateData.linkedStylist = linkedStylist || null;
    if (linkedStylistCategory !== undefined) updateData.linkedStylistCategory = linkedStylistCategory || null;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (startDate !== undefined) updateData.startDate = startDate || null;
    if (endDate !== undefined) updateData.endDate = endDate || null;
    if (buttonText !== undefined) updateData.buttonText = buttonText;
    if (buttonColor !== undefined) updateData.buttonColor = buttonColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : tags.split(",");
    }

    // Update images if provided
    if (webDesktopUrl || webTabletUrl || mobileUrl || imageUrl) {
      updateData.images = {
        web: {
          desktop: webDesktopUrl || updateData.images?.web?.desktop || "",
          tablet: webTabletUrl || updateData.images?.web?.tablet || "",
        },
        mobile: mobileUrl || updateData.images?.mobile || "",
      };
      updateData.image = imageUrl || webDesktopUrl || mobileUrl || "";
    }

    const banner = await StylistBanner.findByIdAndUpdate(bannerId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("linkedStylist", "stylistName stylistImage stylistCity stylistState")
      .populate("linkedStylistCategory", "name description image icon");

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stylist banner updated successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Error updating stylist banner:", error);
    res.status(500).json({
      success: false,
      message: "Error updating stylist banner",
      error: error.message,
    });
  }
};

// Delete Stylist Banner
exports.deleteStylistBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await StylistBanner.findByIdAndDelete(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    // TODO: Delete associated images from Firebase Storage

    res.status(200).json({
      success: true,
      message: "Stylist banner deleted successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Error deleting stylist banner:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting stylist banner",
      error: error.message,
    });
  }
};

// Toggle Stylist Banner Active Status
exports.toggleStylistBannerStatus = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await StylistBanner.findById(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    banner.isActive = !banner.isActive;
    banner.updatedBy = req.user?.id || req.user?._id || null;
    banner.updatedDate = new Date();
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Stylist banner ${banner.isActive ? "activated" : "deactivated"} successfully`,
      data: banner,
    });
  } catch (error) {
    console.error("Error toggling stylist banner status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling stylist banner status",
      error: error.message,
    });
  }
};

// Track Stylist Banner Click
exports.trackStylistBannerClick = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await StylistBanner.findByIdAndUpdate(
      bannerId,
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stylist banner click tracked successfully",
      data: {
        bannerId: banner._id,
        clickCount: banner.clickCount,
      },
    });
  } catch (error) {
    console.error("Error tracking stylist banner click:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking stylist banner click",
      error: error.message,
    });
  }
};

// Track Stylist Banner Impression
exports.trackStylistBannerImpression = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await StylistBanner.findByIdAndUpdate(
      bannerId,
      { $inc: { impressionCount: 1 } },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stylist banner impression tracked successfully",
      data: {
        bannerId: banner._id,
        impressionCount: banner.impressionCount,
      },
    });
  } catch (error) {
    console.error("Error tracking stylist banner impression:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking stylist banner impression",
      error: error.message,
    });
  }
};

// Get Stylist Banner Analytics
exports.getStylistBannerAnalytics = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await StylistBanner.findById(bannerId).select(
      "name clickCount impressionCount createdDate"
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Stylist banner not found",
      });
    }

    const clickThroughRate =
      banner.impressionCount > 0
        ? ((banner.clickCount / banner.impressionCount) * 100).toFixed(2)
        : 0;

    res.status(200).json({
      success: true,
      message: "Stylist banner analytics retrieved successfully",
      data: {
        bannerId: banner._id,
        bannerName: banner.name,
        clickCount: banner.clickCount,
        impressionCount: banner.impressionCount,
        clickThroughRate: parseFloat(clickThroughRate),
        createdDate: banner.createdDate,
      },
    });
  } catch (error) {
    console.error("Error getting stylist banner analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving stylist banner analytics",
      error: error.message,
    });
  }
};

// Reorder Stylist Banners
exports.reorderStylistBanners = async (req, res) => {
  try {
    const { bannerOrders } = req.body; // Array of { bannerId, displayOrder }

    if (!Array.isArray(bannerOrders) || bannerOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bannerOrders must be a non-empty array",
      });
    }

    const updatePromises = bannerOrders.map(({ bannerId, displayOrder }) => {
      if (!mongoose.Types.ObjectId.isValid(bannerId)) {
        return Promise.reject(new Error(`Invalid banner ID: ${bannerId}`));
      }
      return StylistBanner.findByIdAndUpdate(bannerId, {
        displayOrder: displayOrder,
        updatedDate: new Date(),
      });
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: "Stylist banners reordered successfully",
      data: {
        updatedCount: bannerOrders.length,
      },
    });
  } catch (error) {
    console.error("Error reordering stylist banners:", error);
    res.status(500).json({
      success: false,
      message: "Error reordering stylist banners",
      error: error.message,
    });
  }
};

