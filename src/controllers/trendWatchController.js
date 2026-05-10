const TrendWatch = require("../models/trendWatchModel");

// ────────────────────────────────────────────────
//  PUBLIC ROUTES
// ────────────────────────────────────────────────

/**
 * GET /trend-watch
 * Returns all active trend-watch groups (for the homepage section).
 * Products are populated with basic fields only.
 */
exports.getActiveTrendGroups = async (req, res) => {
  try {
    const groups = await TrendWatch.find({ isActive: true })
      .sort({ displayOrder: 1, createdDate: -1 })
      .populate({
        path: "products",
        select: "productName price mrp coverImage discount isTrending category subCategory",
        populate: [
          { path: "category", select: "name" },
          { path: "subCategory", select: "name" },
        ],
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Trend watch groups fetched successfully",
      groups,
    });
  } catch (error) {
    console.error("getActiveTrendGroups error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /trend-watch/:id
 * Returns a single trend group with its products and completeLookProducts populated.
 */
exports.getTrendGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await TrendWatch.findById(id)
      .populate({
        path: "products",
        select:
          "productName description price mrp coverImage discount isTrending category subCategory variants material fabric fit in_stock stock returnable averageRating totalRatings",
        populate: [
          { path: "category", select: "name" },
          { path: "subCategory", select: "name" },
        ],
      })
      .populate({
        path: "completeLookProducts",
        select:
          "productName description price mrp coverImage discount category subCategory in_stock variants",
        populate: [
          { path: "category", select: "name" },
          { path: "subCategory", select: "name" },
        ],
      })
      .lean();

    if (!group) {
      return res.status(404).json({ success: false, message: "Trend group not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Trend group fetched successfully",
      group,
    });
  } catch (error) {
    console.error("getTrendGroupById error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ────────────────────────────────────────────────
//  ADMIN ROUTES
// ────────────────────────────────────────────────

/**
 * GET /trend-watch/admin/all
 * Returns all trend groups (active + inactive) for admin management.
 */
exports.getAllTrendGroupsAdmin = async (req, res) => {
  try {
    const groups = await TrendWatch.find()
      .sort({ displayOrder: 1, createdDate: -1 })
      .populate({
        path: "products",
        select: "productName price mrp coverImage",
      })
      .populate({
        path: "completeLookProducts",
        select: "productName price mrp coverImage",
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "All trend watch groups fetched successfully",
      groups,
    });
  } catch (error) {
    console.error("getAllTrendGroupsAdmin error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /trend-watch
 * Admin creates a new trend group.
 * Body: { label, bigImage, smallImages[], products[], completeLookProducts[], displayOrder, isActive }
 */
exports.createTrendGroup = async (req, res) => {
  try {
    const {
      label,
      bigImage,
      smallImages,
      products,
      completeLookProducts,
      displayOrder,
      isActive,
    } = req.body;

    if (!label) {
      return res.status(400).json({ success: false, message: "label is required" });
    }
    if (!bigImage) {
      return res.status(400).json({ success: false, message: "bigImage URL is required" });
    }
    if (!products || !Array.isArray(products) || products.length < 1) {
      return res.status(400).json({ success: false, message: "At least 1 product is required" });
    }
    if (products.length > 4) {
      return res.status(400).json({ success: false, message: "Maximum 4 products allowed" });
    }

    const group = await TrendWatch.create({
      label,
      bigImage,
      smallImages: smallImages || [],
      products,
      completeLookProducts: completeLookProducts || [],
      displayOrder: displayOrder ?? 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Trend group created successfully",
      group,
    });
  } catch (error) {
    console.error("createTrendGroup error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * PUT /trend-watch/:id
 * Admin updates a trend group.
 */
exports.updateTrendGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      bigImage,
      smallImages,
      products,
      completeLookProducts,
      displayOrder,
      isActive,
    } = req.body;

    if (products && products.length > 4) {
      return res.status(400).json({ success: false, message: "Maximum 4 products allowed" });
    }

    const updateData = { updatedDate: new Date() };
    if (label !== undefined) updateData.label = label;
    if (bigImage !== undefined) updateData.bigImage = bigImage;
    if (smallImages !== undefined) updateData.smallImages = smallImages;
    if (products !== undefined) updateData.products = products;
    if (completeLookProducts !== undefined) updateData.completeLookProducts = completeLookProducts;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const group = await TrendWatch.findByIdAndUpdate(id, updateData, { new: true }).populate(
      "products completeLookProducts",
      "productName price mrp coverImage"
    );

    if (!group) {
      return res.status(404).json({ success: false, message: "Trend group not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Trend group updated successfully",
      group,
    });
  } catch (error) {
    console.error("updateTrendGroup error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * PATCH /trend-watch/:id/toggle
 * Admin toggles isActive status.
 */
exports.toggleTrendGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await TrendWatch.findById(id);

    if (!group) {
      return res.status(404).json({ success: false, message: "Trend group not found" });
    }

    group.isActive = !group.isActive;
    group.updatedDate = new Date();
    await group.save();

    return res.status(200).json({
      success: true,
      message: `Trend group ${group.isActive ? "activated" : "deactivated"} successfully`,
      group,
    });
  } catch (error) {
    console.error("toggleTrendGroup error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * DELETE /trend-watch/:id
 * Admin deletes a trend group.
 */
exports.deleteTrendGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await TrendWatch.findByIdAndDelete(id);

    if (!group) {
      return res.status(404).json({ success: false, message: "Trend group not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Trend group deleted successfully",
    });
  } catch (error) {
    console.error("deleteTrendGroup error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /trend-watch/reorder
 * Admin reorders trend groups.
 * Body: { orders: [{ id, displayOrder }] }
 */
exports.reorderTrendGroups = async (req, res) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: "orders array is required" });
    }

    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder, updatedDate: new Date() } },
      },
    }));

    await TrendWatch.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: "Trend groups reordered successfully",
    });
  } catch (error) {
    console.error("reorderTrendGroups error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
