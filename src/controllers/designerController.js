const mongoose = require("mongoose");
const Designer = require("../models/designerModel");
const User = require("../models/userModel");
const path = require("path");
const { bucket } = require("../service/firebaseServices"); // Firebase storage configuration
const UpdateRequest = require("../models/updateDesignerSchema");
const Video = require("../models/videosModel");
const Product = require("../models/productModels");

// Upload Image Helper Function
const uploadImage = async (file, folder) => {
  const filename = `${Date.now()}_${file.originalname}`;
  const blob = bucket.file(`${folder}/${filename}`);

  return new Promise((resolve, reject) => {
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        firebaseStorageDownloadTokens: Math.random().toString(36),
      },
    });

    blobStream.on("error", (error) => {
      console.error("Error uploading image:", error);
      reject(error);
    });

    blobStream.on("finish", async () => {
      try {
        const firebaseUrl = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        resolve(firebaseUrl[0]);
      } catch (error) {
        reject(new Error(`Error getting signed URL: ${error.message}`));
      }
    });

    blobStream.end(file.buffer);
  });
};

// Create a new Designer
exports.createDesigner = async (req, res) => {
  try {
    const { userId, shortDescription, about } = req.body;

    // Retrieve files from request
    const logoFile = req.files?.logo?.[0];
    const backgroundFile = req.files?.backGroundImage?.[0];

    // Upload files to Firebase if provided
    const logoUrl = logoFile
      ? await uploadImage(logoFile, "designer_logos")
      : null;

    const backGroundImageUrl = backgroundFile
      ? await uploadImage(backgroundFile, "designer_backgrounds")
      : null;

    // Create a new designer document
    const designer = new Designer({
      userId,
      logoUrl,
      backGroundImage: backGroundImageUrl,
      shortDescription,
      about,
    });

    // Save the designer document to MongoDB
    await designer.save();

    console.log("Designer created successfully:", designer);
    return res.status(201).json({
      message: "Designer created successfully",
      designer,
    });
  } catch (error) {
    console.error("Error creating designer:", error.message);
    return res.status(500).json({
      message: "Error creating designer",
      error: error.message,
    });
  }
};
exports.getAllDesigners = async (req, res) => {
  try {
    // Sort the designers by createdTime in descending order
    const designers = await Designer.find({ is_approved: true })
      .populate("userId", "displayName")
      .sort({ createdTime: -1 }); // Sort by createdTime, latest first

    if (!designers.length) {
      return res.status(404).json({ message: "No designers found" });
    }

    return res.status(200).json({ designers });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching designers",
      error: error.message,
    });
  }
};

exports.toggleDesignerApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const designer = await Designer.findById(id);
    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    // Simply toggle the boolean value
    designer.is_approved = !designer.is_approved;
    await designer.save();

    return res.status(200).json({
      message: `Designer ${designer.is_approved ? "approved" : "disabled"
        } successfully`,
      is_approved: designer.is_approved,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error toggling designer status",
      error: error.message,
    });
  }
};
exports.getAllDesignersForAdmin = async (req, res) => {
  try {
    // Sort the designers by createdTime in descending order
    const designers = await Designer.find()
      .populate("userId", "displayName")
      .sort({ createdTime: -1 }); // Sort by createdTime, latest first

    if (!designers.length) {
      return res.status(404).json({ message: "No designers found" });
    }

    return res.status(200).json({ designers });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching designers",
      error: error.message,
    });
  }
};

// Get Designer by ID
exports.getDesignerById = async (req, res) => {
  try {
    const { id } = req.params;
    const designer = await Designer.findById(id).populate(
      "userId",
      "displayName email phoneNumber address city state pincode"
    );

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({ designer });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching designer",
      error: error.message,
    });
  }
};

// Update Designer
exports.updateDesigner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Handle image uploads if new images are provided
    if (req.files.logo) {
      updates.logoUrl = await uploadImage(req.files.logo[0], "designer_logos");
    }

    if (req.files.backGroundImage) {
      updates.backGroundImage = await uploadImage(
        req.files.backGroundImage[0],
        "designer_backgrounds"
      );
    }

    updates.updatedTime = Date.now(); // Update timestamp

    const designer = await Designer.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res
      .status(200)
      .json({ message: "Designer updated successfully", designer });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating designer",
      error: error.message,
    });
  }
};

// Delete Designer
exports.deleteDesigner = async (req, res) => {
  try {
    const { id } = req.params;

    const designer = await Designer.findByIdAndDelete(id);

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({ message: "Designer deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting designer",
      error: error.message,
    });
  }
};

exports.getTotalDesignerCount = async (req, res) => {
  try {
    // Count the total number of documents in the Designer collection
    const totalDesigners = await Designer.countDocuments();

    return res.status(200).json({ totalDesigners });
  } catch (error) {
    console.error("Error fetching total designer count:", error);
    return res.status(500).json({
      message: "Error fetching total designer count",
      error: error.message,
    });
  }
};

// Get Designer Details and Associated User by Designer ID
exports.getDesignerDetailsById = async (req, res) => {
  try {
    const { designerId } = req.params;

    // Find the designer and populate user details
    const designer = await Designer.findById(designerId).populate(
      "userId",
      "displayName email phoneNumber address"
    );

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({ designer });
  } catch (error) {
    console.error("Error fetching designer details:", error);
    return res.status(500).json({
      message: "Error fetching designer details",
      error: error.message,
    });
  }
};

exports.updateDesignerInfo = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { _id, ...updates } = req.body; // Destructure _id to exclude it from updates

    // Include only the necessary fields for update
    if (updates.logoUrl) {
      updates.logoUrl = updates.logoUrl;
    }

    if (updates.backGroundImage) {
      updates.backGroundImage = updates.backGroundImage;
    }

    // Update timestamp
    updates.updatedTime = Date.now();

    const updatedDesigner = await Designer.findByIdAndUpdate(
      designerId,
      updates,
      {
        new: true,
      }
    ).populate("userId", "displayName email phoneNumber address");

    if (!updatedDesigner) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({
      message: "Designer information updated successfully",
      designer: updatedDesigner,
    });
  } catch (error) {
    console.error("Error updating designer information:", error);
    return res.status(500).json({
      message: "Error updating designer information",
      error: error.message,
    });
  }
};

exports.updateProfileRequest = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { updates } = req.body;

    // Check if designer exists
    const designer = await Designer.findById(designerId);
    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    // Save the update request for admin approval
    const updateRequest = new UpdateRequest({
      designerId,
      requestedUpdates: updates,
    });

    await updateRequest.save();

    res.status(201).json({
      message:
        "Profile update request submitted successfully. Pending admin approval.",
      updateRequest,
    });
  } catch (error) {
    console.error("Error submitting profile update request:", error);
    res.status(500).json({
      message: "Error submitting profile update request",
      error: error.message,
    });
  }
};

exports.getLatestUpdateRequests = async (req, res) => {
  try {
    // Fetch all update requests sorted by the most recent first
    const updateRequests = await UpdateRequest.find()
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .populate({
        path: "designerId", // Populate designer details
        populate: {
          path: "userId", // Populate user details from the User table
          select: "displayName email phoneNumber", // Select necessary fields
        },
      })
      .exec();

    res.status(200).json({
      message: "Latest update requests fetched successfully",
      updateRequests,
    });
  } catch (error) {
    console.error("Error fetching latest update requests:", error);
    res.status(500).json({
      message: "Error fetching latest update requests",
      error: error.message,
    });
  }
};

exports.requestUpdateDesignerInfo = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { updates } = req.body;

    // Check if designer exists
    const designer = await Designer.findById(designerId);
    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    // Create a new update request
    const updateRequest = new UpdateRequest({
      designerId,
      requestedUpdates: updates,
    });

    await updateRequest.save();

    res.status(201).json({
      message: "Update request submitted successfully. Pending admin approval.",
      updateRequest,
    });
  } catch (error) {
    console.error("Error requesting designer info update:", error);
    res.status(500).json({
      message: "Error requesting designer info update",
      error: error.message,
    });
  }
};
exports.reviewUpdateRequests = async (req, res) => {
  try {
    const { requestId } = req.params; // Update request ID
    const { status, adminComments } = req.body;

    // Find the update request
    const updateRequest = await UpdateRequest.findById(requestId).populate(
      "designerId"
    );

    if (!updateRequest) {
      return res.status(404).json({ message: "Update request not found" });
    }

    if (updateRequest.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "This request has already been reviewed" });
    }

    let updatedUser = null;
    let updatedDesigner = null;

    // If approved, update the designer's information
    if (status === "Approved") {
      // Handle both populated and non-populated designerId
      const designerId = updateRequest.designerId._id || updateRequest.designerId;
      const updates = updateRequest.requestedUpdates;

      if (!designerId) {
        return res.status(400).json({
          message: "Invalid designer ID in update request"
        });
      }

      // Validate that requestedUpdates is an object
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({
          message: "Invalid update data format. Expected an object."
        });
      }

      // Get the designer to access userId
      const designer = await Designer.findById(designerId);
      if (!designer) {
        return res.status(404).json({
          message: "Designer not found"
        });
      }

      const userDoc = await User.findById(designer.userId);
      if (!userDoc) {
        return res.status(404).json({
          message: "User not found for the designer"
        });
      }

      // Define which fields belong to User model vs Designer model
      const userFields = [
        'displayName',
        'phoneNumber',
        'email',
        'fcmToken'
      ];

      const addressFieldKeys = [
        'address',
        'addressId',
        'nick_name',
        'city',
        'state',
        'pincode',
        'street_details'
      ];

      // Separate fields into User and Designer updates
      const userUpdateFields = {};
      const designerUpdateFields = {};
      const addressFieldUpdates = {};
      let explicitAddressPayload = undefined;

      // Iterate through all keys in requestedUpdates
      Object.keys(updates).forEach((key) => {
        const value = updates[key];

        // Skip _id and undefined/null values, but allow empty strings and 0
        if (
          key === "_id" ||
          key === "__v" ||
          value === undefined ||
          value === null
        ) {
          return;
        }

        if (addressFieldKeys.includes(key)) {
          if (key === "address") {
            explicitAddressPayload = value;
          } else {
            addressFieldUpdates[key] = value;
          }
          return;
        }

        if (userFields.includes(key)) {
          userUpdateFields[key] = value;
        } else {
          designerUpdateFields[key] = value;
        }
      });

      const normalizeAddress = () => {
        let normalized = null;

        if (explicitAddressPayload !== undefined) {
          if (Array.isArray(explicitAddressPayload)) {
            if (explicitAddressPayload.length > 0) {
              normalized = { ...explicitAddressPayload[0] };
            } else {
              normalized = {};
            }
          } else if (
            explicitAddressPayload &&
            typeof explicitAddressPayload === "object"
          ) {
            normalized = { ...explicitAddressPayload };
          } else if (
            typeof explicitAddressPayload === "string" &&
            explicitAddressPayload.trim() !== ""
          ) {
            normalized = { street_details: explicitAddressPayload.trim() };
          } else if (explicitAddressPayload === "" || explicitAddressPayload === null) {
            normalized = {};
          }
        }

        const hasAdditionalAddressFields = Object.keys(addressFieldUpdates).some(
          (field) =>
            !["address", "addressId"].includes(field) &&
            addressFieldUpdates[field] !== undefined &&
            addressFieldUpdates[field] !== null
        );

        if (!normalized && hasAdditionalAddressFields) {
          normalized = {};
        }

        if (normalized) {
          Object.entries(addressFieldUpdates).forEach(([field, val]) => {
            if (
              field === "addressId" &&
              val !== undefined &&
              val !== null &&
              val !== ""
            ) {
              normalized._id = val;
              return;
            }

            if (val !== undefined && val !== null) {
              normalized[field] = val;
            }
          });

          if (
            normalized.addressId &&
            !normalized._id &&
            normalized.addressId !== ""
          ) {
            normalized._id = normalized.addressId;
          }

          delete normalized.addressId;

          if (normalized.pincode !== undefined) {
            const parsedPincode = Number(normalized.pincode);
            if (!Number.isNaN(parsedPincode)) {
              normalized.pincode = parsedPincode;
            } else {
              delete normalized.pincode;
            }
          }

          Object.keys(normalized).forEach((field) => {
            if (normalized[field] === undefined || normalized[field] === null) {
              delete normalized[field];
            }
          });

          if (Object.keys(normalized).length === 0) {
            normalized = null;
          }
        }

        return normalized;
      };

      const normalizedAddressUpdate = normalizeAddress();

      // Update User model if there are user fields to update
      if (
        Object.keys(userUpdateFields).length > 0 ||
        normalizedAddressUpdate
      ) {
        Object.entries(userUpdateFields).forEach(([field, val]) => {
          userDoc[field] = val;
        });

        if (normalizedAddressUpdate) {
          const targetAddressId = normalizedAddressUpdate._id
            ? normalizedAddressUpdate._id.toString()
            : null;

          const updatableFields = { ...normalizedAddressUpdate };
          delete updatableFields._id;

          if (!Array.isArray(userDoc.address)) {
            userDoc.address = [];
          }

          if (targetAddressId) {
            const addressIndex = userDoc.address.findIndex(
              (addr) => addr._id && addr._id.toString() === targetAddressId
            );

            if (addressIndex !== -1) {
              Object.entries(updatableFields).forEach(([field, val]) => {
                userDoc.address[addressIndex][field] = val;
              });
            } else {
              userDoc.address.push(updatableFields);
            }
          } else if (userDoc.address.length > 0) {
            Object.entries(updatableFields).forEach(([field, val]) => {
              userDoc.address[0][field] = val;
            });
          } else if (Object.keys(updatableFields).length > 0) {
            userDoc.address.push(updatableFields);
          }
        }

        updatedUser = await userDoc.save();

        if (!updatedUser) {
          return res.status(404).json({
            message: "User not found after update attempt"
          });
        }

        console.log("User updated successfully:", {
          userId: designer.userId.toString(),
          updatedFields: [
            ...Object.keys(userUpdateFields),
            ...(normalizedAddressUpdate ? ["address"] : []),
          ],
          updateFields: {
            ...userUpdateFields,
            ...(normalizedAddressUpdate ? { address: normalizedAddressUpdate } : {}),
          },
        });
      }

      // Always update the updatedTime field for Designer
      if (Object.keys(designerUpdateFields).length > 0) {
        designerUpdateFields.updatedTime = Date.now();
      }

      // Update Designer model if there are designer fields to update
      if (Object.keys(designerUpdateFields).length > 0) {
        updatedDesigner = await Designer.findByIdAndUpdate(
          designerId,
          { $set: designerUpdateFields },
          { new: true, runValidators: true }
        );

        if (!updatedDesigner) {
          return res.status(404).json({
            message: "Designer not found after update attempt"
          });
        }

        console.log("Designer updated successfully:", {
          designerId: designerId.toString(),
          updatedFields: Object.keys(designerUpdateFields),
          updateFields: designerUpdateFields
        });
      } else {
        // Still fetch the designer to return in response
        updatedDesigner = await Designer.findById(designerId).populate('userId');
      }

      // If no fields were updated in either model, log a warning
      if (
        Object.keys(userUpdateFields).length === 0 &&
        Object.keys(designerUpdateFields).length === 0 &&
        !normalizedAddressUpdate
      ) {
        console.warn("No valid fields to update for designer:", designerId);
      }

      updateRequest.status = "Approved";
      updateRequest.adminComments = adminComments || "Approved by Admin";
    } else if (status === "Rejected") {
      updateRequest.status = "Rejected";
      updateRequest.adminComments = adminComments || "Rejected by Admin";
    }

    // Save the update request status
    await updateRequest.save();

    // Prepare response
    const response = {
      message: `Request ${status.toLowerCase()} successfully`,
      updateRequest,
    };

    // If approved and designer was updated, include the updated designer and user in response
    if (status === "Approved") {
      // Populate designer if not already populated
      if (updatedDesigner && (!updatedDesigner.userId || typeof updatedDesigner.userId === 'string')) {
        updatedDesigner = await Designer.findById(updatedDesigner._id).populate('userId');
      }

      response.updatedDesigner = {
        id: updatedDesigner?._id,
        shortDescription: updatedDesigner?.shortDescription,
        about: updatedDesigner?.about,
        logoUrl: updatedDesigner?.logoUrl,
        backGroundImage: updatedDesigner?.backGroundImage,
        store_banner_web: updatedDesigner?.store_banner_web,
        is_approved: updatedDesigner?.is_approved,
        updatedTime: updatedDesigner?.updatedTime,
      };

      // Include updated user fields if user was updated
      if (updatedUser) {
        response.updatedUser = {
          id: updatedUser._id,
          displayName: updatedUser.displayName,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          address: updatedUser.address,
        };
      } else if (updatedDesigner?.userId) {
        // Include user info from populated designer
        response.updatedUser = {
          id: updatedDesigner.userId._id,
          displayName: updatedDesigner.userId.displayName,
          email: updatedDesigner.userId.email,
          phoneNumber: updatedDesigner.userId.phoneNumber,
          address: updatedDesigner.userId.address,
        };
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error reviewing update request:", error);
    res.status(500).json({
      message: "Error reviewing update request",
      error: error.message,
    });
  }
};

exports.getPickupLocationName = async (req, res) => {
  try {
    const { designerId } = req.params; // Get designer reference (designerId) from request params

    // Find the designer by ID
    const designer = await Designer.findById(designerId).select(
      "pickup_location_name"
    );

    // If designer not found, return a 404 response
    if (!designer) {
      return res.status(404).json({
        message: "Designer not found",
      });
    }

    // Return the pickup_location_name
    res.status(200).json({
      message: "Pickup location name fetched successfully",
      pickup_location_name: designer.pickup_location_name,
    });
  } catch (error) {
    console.error("Error fetching pickup location name:", error);
    res.status(500).json({
      message: "Error fetching pickup location name",
      error: error.message,
    });
  }
};

exports.getPendingDesignerCount = async (req, res) => {
  try {
    const pendingCount = await Designer.countDocuments({ is_approved: false });
    return res.status(200).json({ pendingCount });
  } catch (error) {
    console.error("Error fetching pending designer count:", error);
    return res.status(500).json({
      message: "Error fetching pending designer count",
      error: error.message,
    });
  }
};

// Get the count of approved designers (is_approved: true)
exports.getApprovedDesignerCount = async (req, res) => {
  try {
    const approvedCount = await Designer.countDocuments({ is_approved: true });
    return res.status(200).json({ approvedCount });
  } catch (error) {
    console.error("Error fetching approved designer count:", error);
    return res.status(500).json({
      message: "Error fetching approved designer count",
      error: error.message,
    });
  }
};

exports.updateDesignerApprovalStatus = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { is_approved } = req.body;

    // Ensure is_approved is a boolean before updating
    if (typeof is_approved !== "boolean") {
      return res.status(400).json({ message: "Invalid approval status" });
    }

    const designer = await Designer.findByIdAndUpdate(
      designerId,
      { is_approved, updatedTime: Date.now() },
      { new: true }
    ).populate("userId", "displayName email phoneNumber address");

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({
      message: `Designer approval status updated successfully`,
      designer,
    });
  } catch (error) {
    console.error("Error updating designer approval status:", error);
    return res.status(500).json({
      message: "Error updating designer approval status",
      error: error.message,
    });
  }
};

exports.getDesignerNameByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the designer by userId and populate the displayName from the User table
    const designer = await Designer.findOne({ userId }).populate(
      "userId",
      "displayName"
    );

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    // Return the designer's name (displayName from User table)
    return res.status(200).json({
      message: "Designer fetched successfully",
      designer: {
        displayName: designer.userId.displayName, // Access populated displayName
        userId: designer.userId._id,
      },
    });
  } catch (error) {
    console.error("Error fetching designer by userId:", error);
    return res.status(500).json({
      message: "Error fetching designer by userId",
      error: error.message,
    });
  }
};

exports.createDesignerVideosForProducts = async (req, res) => {
  try {
    const {
      videoUrl,
      userId,
      productTagged,
      designerRef,
      demo_url,
      instagram_User,
    } = req.body;

    // Validate required fields
    if (!videoUrl || !productTagged || !designerRef) {
      return res.status(400).json({
        success: false,
        message: "videoUrl, productTagged, and designerRef are required",
      });
    }

    // Create new video
    const newVideo = new Video({
      videoUrl: Array.isArray(videoUrl) ? videoUrl : [videoUrl],
      typeOfVideo: "ProductVideo",
      productTagged,
      userId,
      designerRef,
      demo_url,
      instagram_User,
      is_approved: false, // Default to false for approval
    });

    // Save video to database
    const savedVideo = await newVideo.save();

    res.status(201).json({
      success: true,
      message: "Designer video for products created successfully",
      data: savedVideo,
    });
  } catch (error) {
    console.error("Error creating designer video:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAllDesignerVideosForProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, approved, designerId, productId } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { typeOfVideo: "ProductVideo" };

    // Add filters
    if (approved !== undefined) query.is_approved = approved === "true";
    if (designerId) query.designerRef = designerId;
    if (productId) query.productTagged = { $in: [productId] };

    // Get videos with population
    const videos = await Video.find(query)
      .populate({
        path: "productTagged",
        select:
          "productName description price mrp coverImage in_stock discount averageRating variants designerRef",
        model: "Product",
        populate: [
          {
            path: "designerRef",
            select: "name profileImage",
          },
          {
            path: "category",
            select: "name",
          },
          {
            path: "subCategory",
            select: "name",
          },
        ],
      })
      .populate({
        path: "designerRef",
        select: "name profileImage bio",
        model: "Designer",
      })
      .populate({
        path: "userId",
        select: "username profileImage",
        model: "User",
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_at: -1 });

    // Count total videos for pagination info
    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Designer videos for products retrieved successfully",
      data: videos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting designer videos:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getDesignerVideoForProductsById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find video by ID with detailed population
    const video = await Video.findOne({ _id: id, typeOfVideo: "ProductVideo" })
      .populate({
        path: "productTagged",
        select:
          "productName description price mrp coverImage in_stock discount averageRating variants material fabric is_sustainable productDetails fit reviews",
        model: "Product",
        populate: [
          {
            path: "designerRef",
            select: "name profileImage bio",
          },
          {
            path: "category",
            select: "name slug",
          },
          {
            path: "subCategory",
            select: "name slug",
          },
          {
            path: "reviews.userId",
            select: "name profileImage",
          },
        ],
      })
      .populate({
        path: "designerRef",
        select: "name profileImage bio socialMedia",
        model: "Designer",
      })
      .populate({
        path: "userId",
        select: "username email profileImage",
        model: "User",
      });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Designer video not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Designer video retrieved successfully",
      data: video,
    });
  } catch (error) {
    console.error("Error getting designer video by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// Approve designer video for products
exports.ApproveDesignerVideoForProducts = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and update video
    const video = await Video.findOneAndUpdate(
      { _id: id, typeOfVideo: "ProductVideo" },
      { is_approved: true, updated_at: Date.now() },
      { new: true }
    ).populate("productTagged designerRef userId");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Designer video not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Designer video approved successfully",
      data: video,
    });
  } catch (error) {
    console.error("Error approving designer video:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Reject designer video for products
exports.rejectDesignerVideoForProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body; // Optional rejection reason

    // Find and update video
    const video = await Video.findOneAndUpdate(
      { _id: id, typeOfVideo: "ProductVideo" },
      {
        is_approved: false,
        updated_at: Date.now(),
        rejectionReason: rejectionReason || "Rejected by admin",
      },
      { new: true }
    ).populate("productTagged designerRef userId");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Designer video not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Designer video rejected successfully",
      data: video,
    });
  } catch (error) {
    console.error("Error rejecting designer video:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get designers for dropdown filters
exports.getDesignersForDropdown = async (req, res) => {
  try {
    const { approved = true, search } = req.query;

    // Build query
    let query = {};

    if (approved === 'true' || approved === true) {
      query.is_approved = true;
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { 'userId.displayName': { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }

    // Get designers with populated userId for displayName
    const designers = await Designer.find(query)
      .populate('userId', 'displayName')
      .select('_id userId shortDescription is_approved')
      .sort({ 'userId.displayName': 1 }); // Sort alphabetically by display name

    // Transform the data to match your frontend expectations
    const dropdownDesigners = designers.map(designer => ({
      _id: designer._id,
      displayName: designer.userId?.displayName || 'Unknown Designer',
      shortDescription: designer.shortDescription,
      is_approved: designer.is_approved
    }));

    return res.status(200).json({
      success: true,
      message: "Designers retrieved successfully for dropdown",
      data: {
        designers: dropdownDesigners,
        total: dropdownDesigners.length
      }
    });

  } catch (error) {
    console.error("Error fetching designers for dropdown:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching designers for dropdown",
      error: error.message
    });
  }
};

// Add Product Sample Images for Designer (using URLs)
exports.addProductSampleImages = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { imageUrls } = req.body;

    // Validate designer ID
    if (!designerId || !mongoose.Types.ObjectId.isValid(designerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid designer ID is required",
      });
    }

    // Validate imageUrls
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image URL is required",
      });
    }

    // Validate that all items in array are strings (URLs)
    const invalidUrls = imageUrls.filter(url => typeof url !== 'string' || url.trim() === '');
    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All image URLs must be valid strings",
      });
    }

    // Find the designer
    const designer = await Designer.findById(designerId);
    if (!designer) {
      return res.status(404).json({
        success: false,
        message: "Designer not found",
      });
    }

    // Add new image URLs to the existing array
    const updatedImages = [...(designer.product_sample_images || []), ...imageUrls];

    // Update the designer with new sample images
    designer.product_sample_images = updatedImages;
    designer.updatedTime = Date.now();
    await designer.save();

    return res.status(200).json({
      success: true,
      message: "Product sample images added successfully",
      data: {
        designerId: designer._id,
        totalImages: updatedImages.length,
        newImages: imageUrls,
        allImages: updatedImages,
      },
    });
  } catch (error) {
    console.error("Error adding product sample images:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding product sample images",
      error: error.message,
    });
  }
};

// Update/Edit Product Sample Images for Designer (using URLs)
exports.updateProductSampleImages = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { imageUrls, removeImageIndexes } = req.body;

    // Validate designer ID
    if (!designerId || !mongoose.Types.ObjectId.isValid(designerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid designer ID is required",
      });
    }

    // Find the designer
    const designer = await Designer.findById(designerId);
    if (!designer) {
      return res.status(404).json({
        success: false,
        message: "Designer not found",
      });
    }

    let updatedImages = [...(designer.product_sample_images || [])];

    // Remove images by index if provided
    if (removeImageIndexes && Array.isArray(removeImageIndexes) && removeImageIndexes.length > 0) {
      // Sort in descending order to remove from the end first (prevents index shifting issues)
      const sortedIndexes = [...removeImageIndexes].sort((a, b) => b - a);
      sortedIndexes.forEach((index) => {
        if (index >= 0 && index < updatedImages.length) {
          updatedImages.splice(index, 1);
        }
      });
    }

    // Replace or add new image URLs if provided
    if (imageUrls && Array.isArray(imageUrls)) {
      // If removeImageIndexes was provided, add to existing; otherwise replace
      if (removeImageIndexes && removeImageIndexes.length > 0) {
        // Add new URLs to existing array
        updatedImages = [...updatedImages, ...imageUrls];
      } else {
        // Replace entire array
        updatedImages = imageUrls;
      }
    }

    // Validate all URLs are strings
    const invalidUrls = updatedImages.filter(url => typeof url !== 'string' || url.trim() === '');
    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All image URLs must be valid strings",
      });
    }

    // Update the designer
    designer.product_sample_images = updatedImages;
    designer.updatedTime = Date.now();
    await designer.save();

    return res.status(200).json({
      success: true,
      message: "Product sample images updated successfully",
      data: {
        designerId: designer._id,
        totalImages: updatedImages.length,
        allImages: updatedImages,
      },
    });
  } catch (error) {
    console.error("Error updating product sample images:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating product sample images",
      error: error.message,
    });
  }
};

// Get Product Sample Images for Designer
exports.getProductSampleImages = async (req, res) => {
  try {
    const { designerId } = req.params;

    // Validate designer ID
    if (!designerId || !mongoose.Types.ObjectId.isValid(designerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid designer ID is required",
      });
    }

    // Find the designer
    const designer = await Designer.findById(designerId).select(
      "product_sample_images userId"
    );

    if (!designer) {
      return res.status(404).json({
        success: false,
        message: "Designer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product sample images retrieved successfully",
      data: {
        designerId: designer._id,
        totalImages: designer.product_sample_images?.length || 0,
        images: designer.product_sample_images || [],
      },
    });
  } catch (error) {
    console.error("Error fetching product sample images:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching product sample images",
      error: error.message,
    });
  }
};

const COMMISSION_THRESHOLD = 10000;
const COMMISSION_RATE = 0.2;

/**
 * Calculate and update commission_total for a designer based on their order sales.
 * Total sales = sum of (price * quantity) for all products of this designer in orders with paymentStatus "Completed".
 * If total sales < 10,000: commission = 0. If total sales >= 10,000: commission = 20% of total sales.
 */
exports.getCommissionTotalForDesigner = async (req, res) => {
  try {
    const { designerId } = req.params;

    if (!designerId) {
      return res.status(400).json({ message: "Designer ID is required" });
    }

    const designer = await Designer.findById(designerId);
    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    // Total sales from orders: only completed payments, only this designer's products
    const salesResult = await Order.aggregate([
      { $match: { paymentStatus: "Completed" } },
      { $unwind: "$products" },
      {
        $match: {
          "products.designerRef":
            typeof designerId === "string"
              ? designerId
              : designerId.toString(),
        },
      },
      {
        $group: {
          _id: "$products.designerRef",
          totalSales: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          },
        },
      },
    ]);

    const totalSales = salesResult.length > 0 ? salesResult[0].totalSales : 0;
    const commission_total =
      totalSales < COMMISSION_THRESHOLD
        ? 0
        : Math.round(totalSales * COMMISSION_RATE * 100) / 100;

    designer.comission_total = commission_total;
    await designer.save();

    return res.status(200).json({
      designerId,
      totalSales,
      commission_total,
      commissionRate:
        totalSales < COMMISSION_THRESHOLD ? 0 : COMMISSION_RATE,
    });
  } catch (error) {
    console.error("Error calculating designer commission:", error);
    return res.status(500).json({
      message: "Error calculating designer commission",
      error: error.message,
    });
  }
};
