const mongoose = require("mongoose");
const StylistProfile = require("../models/stylistProfile");
const StylistCategory = require("../models/stylistCategoryModel");
const User = require("../models/userModel");
const {
    createNotification,
    sendFcmNotification,
} = require("./notificationController");

// Create stylist profile
exports.createStylistProfile = async (req, res) => {
    try {
        const {
            stylistName,
            stylistEmail,
            stylistPhone,
            stylistAddress,
            stylistCity,
            stylistState,
            stylistPincode,
            stylistCountry,
            stylistImage,
            stylistBio,
            stylistPortfolio,
            stylistExperience,
            stylistEducation,
            stylistSkills,
            stylistAvailability,
            stylistPrice,
        } = req.body;

        const userId = req.user._id;

        // Validate required fields
        const requiredFields = [
            'stylistName',
            'stylistEmail',
            'stylistPhone',
            'stylistAddress',
            'stylistCity',
            'stylistState',
            'stylistPincode',
            'stylistCountry',
            'stylistImage',
            'stylistBio',
            'stylistPortfolio',
            'stylistExperience',
            'stylistEducation',
            'stylistSkills',
            'stylistAvailability'
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required`
                });
            }
        }

        // Check if user already has a stylist profile
        const existingProfile = await StylistProfile.findOne({ userId });
        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: "Stylist profile already exists for this user"
            });
        }

        // Validate arrays
        if (!Array.isArray(stylistPortfolio) || stylistPortfolio.length === 0) {
            return res.status(400).json({
                success: false,
                message: "stylistPortfolio must be a non-empty array"
            });
        }

        if (!Array.isArray(stylistSkills) || stylistSkills.length === 0) {
            return res.status(400).json({
                success: false,
                message: "stylistSkills must be a non-empty array"
            });
        }

        // Validate categories if provided
        let categoryIds = [];
        if (req.body.stylistCategories && Array.isArray(req.body.stylistCategories)) {
            for (const catId of req.body.stylistCategories) {
                if (mongoose.Types.ObjectId.isValid(catId)) {
                    const category = await StylistCategory.findOne({ 
                        _id: catId, 
                        isActive: true 
                    });
                    if (category) {
                        categoryIds.push(catId);
                    }
                }
            }
        }

        // Create stylist profile
        const stylistProfile = new StylistProfile({
            userId,
            stylistName,
            stylistEmail,
            stylistPhone,
            stylistAddress,
            stylistCity,
            stylistState,
            stylistPincode,
            stylistCountry,
            stylistImage,
            stylistBio,
            stylistPortfolio,
            stylistExperience,
            stylistEducation,
            stylistSkills,
            stylistCategories: categoryIds,
            stylistAvailability,
            stylistPrice: stylistPrice || 0,
            stylistRating: 0,
            stylistReviews: [],
            isApproved: false,
            approvalStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await stylistProfile.save();

        // Populate user details and categories
        await stylistProfile.populate('userId', 'displayName email phoneNumber role');
        await stylistProfile.populate('stylistCategories', 'name description image icon');

        return res.status(201).json({
            success: true,
            message: "Stylist profile created successfully",
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error creating stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating stylist profile",
            error: error.message
        });
    }
};

// Get stylist profile by user ID
exports.getStylistProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        const stylistProfile = await StylistProfile.findOne({ userId })
            .populate('userId', 'displayName email phoneNumber role profilePicture')
            .populate('stylistCategories', 'name description image icon');

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile retrieved successfully",
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error getting stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving stylist profile",
            error: error.message
        });
    }
};

// Get current user's stylist profile
exports.getMyStylistProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const stylistProfile = await StylistProfile.findOne({ userId })
            .populate('userId', 'displayName email phoneNumber role profilePicture')
            .populate('stylistCategories', 'name description image icon');

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile retrieved successfully",
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error getting stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving stylist profile",
            error: error.message
        });
    }
};

// Update stylist profile
exports.updateStylistProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const updateData = req.body;

        // Remove fields that shouldn't be updated directly
        delete updateData.userId;
        delete updateData.isApproved;
        delete updateData.approvalStatus;
        delete updateData.stylistRating;
        delete updateData.stylistReviews;
        delete updateData.createdAt;

        // Add updated timestamp
        updateData.updatedAt = new Date();

        // Validate arrays if provided
        if (updateData.stylistPortfolio && !Array.isArray(updateData.stylistPortfolio)) {
            return res.status(400).json({
                success: false,
                message: "stylistPortfolio must be an array"
            });
        }

        if (updateData.stylistSkills && !Array.isArray(updateData.stylistSkills)) {
            return res.status(400).json({
                success: false,
                message: "stylistSkills must be an array"
            });
        }

        // Handle category updates if provided
        if (updateData.stylistCategories && Array.isArray(updateData.stylistCategories)) {
            let categoryIds = [];
            for (const catId of updateData.stylistCategories) {
                if (mongoose.Types.ObjectId.isValid(catId)) {
                    const category = await StylistCategory.findOne({ 
                        _id: catId, 
                        isActive: true 
                    });
                    if (category) {
                        categoryIds.push(catId);
                    }
                }
            }
            updateData.stylistCategories = categoryIds;
        }

        const stylistProfile = await StylistProfile.findOneAndUpdate(
            { userId },
            updateData,
            { new: true, runValidators: true }
        )
        .populate('userId', 'displayName email phoneNumber role profilePicture')
        .populate('stylistCategories', 'name description image icon');

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        // If profile was approved and now being updated, reset approval status
        if (stylistProfile.isApproved) {
            stylistProfile.isApproved = false;
            stylistProfile.approvalStatus = "pending";
            await stylistProfile.save();
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile updated successfully",
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error updating stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating stylist profile",
            error: error.message
        });
    }
};

// Get all stylist profiles (Admin only)
exports.getAllStylistProfiles = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = 'all',
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        let query = {};

        // Filter by approval status
        if (status !== 'all') {
            if (status === 'approved') {
                query.isApproved = true;
            } else if (status === 'pending') {
                query.approvalStatus = 'pending';
            } else if (status === 'rejected') {
                query.approvalStatus = 'rejected';
            }
        }

        // Search functionality
        if (search) {
            query.$or = [
                { stylistName: { $regex: search, $options: 'i' } },
                { stylistEmail: { $regex: search, $options: 'i' } },
                { stylistCity: { $regex: search, $options: 'i' } },
                { stylistState: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const stylistProfiles = await StylistProfile.find(query)
            .populate('userId', 'displayName email phoneNumber role profilePicture')
            .populate('stylistCategories', 'name description image icon')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const totalProfiles = await StylistProfile.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Stylist profiles retrieved successfully",
            data: {
                stylistProfiles,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalProfiles / parseInt(limit)),
                    totalProfiles,
                    hasNextPage: skip + stylistProfiles.length < totalProfiles,
                    hasPrevPage: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error("Error getting all stylist profiles:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving stylist profiles",
            error: error.message
        });
    }
};

// Get approved stylist profiles (Public)
exports.getApprovedStylistProfiles = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            city = '',
            state = '',
            minRating = 0,
            maxPrice = null,
            category = '',
            categoryId = '',
            sortBy = 'stylistRating',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query for approved profiles only
        let query = {
            isApproved: true,
            approvalStatus: 'approved',
            applicationStatus: 'approved',
            'bookingSettings.isAvailableForBooking': true
        };

        // Filter by location
        if (city) {
            query.stylistCity = { $regex: city, $options: 'i' };
        }

        if (state) {
            query.stylistState = { $regex: state, $options: 'i' };
        }

        // Filter by rating
        if (minRating > 0) {
            query.stylistRating = { $gte: parseFloat(minRating) };
        }

        // Filter by price
        if (maxPrice !== null && maxPrice !== '') {
            query.stylistPrice = { $lte: parseFloat(maxPrice) };
        }

        // Filter by category
        if (categoryId) {
            if (mongoose.Types.ObjectId.isValid(categoryId)) {
                query.stylistCategories = { $in: [new mongoose.Types.ObjectId(categoryId)] };
            }
        } else if (category) {
            // Find category by name
            const categoryDoc = await StylistCategory.findOne({ 
                name: { $regex: category, $options: 'i' },
                isActive: true
            });
            if (categoryDoc) {
                query.stylistCategories = { $in: [categoryDoc._id] };
            }
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const stylistProfiles = await StylistProfile.find(query)
            .populate('userId', 'displayName email phoneNumber profilePicture')
            .populate('stylistCategories', 'name description image icon')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const totalProfiles = await StylistProfile.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Approved stylist profiles retrieved successfully",
            data: {
                stylistProfiles,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalProfiles / parseInt(limit)),
                    totalProfiles,
                    hasNextPage: skip + stylistProfiles.length < totalProfiles,
                    hasPrevPage: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error("Error getting approved stylist profiles:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving approved stylist profiles",
            error: error.message
        });
    }
};

// Approve stylist profile (Admin only)
exports.approveStylistProfile = async (req, res) => {
    try {
        const { stylistId } = req.params;
        const { adminNotes } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(stylistId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid stylist ID format"
            });
        }

        const stylistProfile = await StylistProfile.findById(stylistId)
            .populate('userId', 'displayName email phoneNumber fcmToken');

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        if (stylistProfile.isApproved) {
            return res.status(400).json({
                success: false,
                message: "Stylist profile is already approved"
            });
        }

        // Update approval status
        stylistProfile.isApproved = true;
        stylistProfile.approvalStatus = 'approved';
        stylistProfile.approvedAt = new Date();
        stylistProfile.approvedBy = req.user._id;
        stylistProfile.adminNotes = adminNotes || '';
        stylistProfile.updatedAt = new Date();

        await stylistProfile.save();

        // Send notification to stylist
        try {
            if (stylistProfile.userId.fcmToken) {
                const notificationData = {
                    userId: stylistProfile.userId._id,
                    title: "Stylist Profile Approved",
                    message: `Congratulations! Your stylist profile has been approved.`,
                    type: "stylist_profile_approved",
                    data: {
                        stylistId: stylistProfile._id,
                        stylistName: stylistProfile.stylistName,
                        approvedAt: stylistProfile.approvedAt
                    }
                };

                await createNotification(notificationData);
                await sendFcmNotification(notificationData);
            }
        } catch (error) {
            console.error("Error sending approval notification:", error);
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile approved successfully",
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error approving stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error approving stylist profile",
            error: error.message
        });
    }
};

// Reject stylist profile (Admin only)
exports.rejectStylistProfile = async (req, res) => {
    try {
        const { stylistId } = req.params;
        const { rejectionReason, adminNotes } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(stylistId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid stylist ID format"
            });
        }

        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        const stylistProfile = await StylistProfile.findById(stylistId)
            .populate('userId', 'displayName email phoneNumber fcmToken');

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        if (stylistProfile.approvalStatus === 'rejected') {
            return res.status(400).json({
                success: false,
                message: "Stylist profile is already rejected"
            });
        }

        // Update rejection status
        stylistProfile.isApproved = false;
        stylistProfile.approvalStatus = 'rejected';
        stylistProfile.rejectedAt = new Date();
        stylistProfile.rejectedBy = req.user._id;
        stylistProfile.rejectionReason = rejectionReason;
        stylistProfile.adminNotes = adminNotes || '';
        stylistProfile.updatedAt = new Date();

        await stylistProfile.save();

        // Send notification to stylist
        try {
            if (stylistProfile.userId.fcmToken) {
                const notificationData = {
                    userId: stylistProfile.userId._id,
                    title: "Stylist Profile Rejected",
                    message: `Your stylist profile has been rejected. Reason: ${rejectionReason}`,
                    type: "stylist_profile_rejected",
                    data: {
                        stylistId: stylistProfile._id,
                        stylistName: stylistProfile.stylistName,
                        rejectionReason,
                        rejectedAt: stylistProfile.rejectedAt
                    }
                };

                await createNotification(notificationData);
                await sendFcmNotification(notificationData);
            }
        } catch (error) {
            console.error("Error sending rejection notification:", error);
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile rejected successfully",
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error rejecting stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error rejecting stylist profile",
            error: error.message
        });
    }
};

// Get pending stylist profiles (Admin only)
exports.getPendingStylistProfiles = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const stylistProfiles = await StylistProfile.find({
            approvalStatus: 'pending'
        })
            .populate('userId', 'displayName email phoneNumber role profilePicture')
            .populate('stylistCategories', 'name description image icon')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalPending = await StylistProfile.countDocuments({
            approvalStatus: 'pending'
        });

        return res.status(200).json({
            success: true,
            message: "Pending stylist profiles retrieved successfully",
            data: {
                stylistProfiles,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalPending / parseInt(limit)),
                    totalPending,
                    hasNextPage: skip + stylistProfiles.length < totalPending,
                    hasPrevPage: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error("Error getting pending stylist profiles:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving pending stylist profiles",
            error: error.message
        });
    }
};

// Delete stylist profile
exports.deleteStylistProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const stylistProfile = await StylistProfile.findOneAndDelete({ userId });

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting stylist profile",
            error: error.message
        });
    }
};

// Get stylist statistics (Admin only)
exports.getStylistStatistics = async (req, res) => {
    try {
        const totalStylists = await StylistProfile.countDocuments();
        const approvedStylists = await StylistProfile.countDocuments({ isApproved: true });
        const pendingStylists = await StylistProfile.countDocuments({ approvalStatus: 'pending' });
        const rejectedStylists = await StylistProfile.countDocuments({ approvalStatus: 'rejected' });

        // Get average rating
        const avgRatingResult = await StylistProfile.aggregate([
            { $match: { isApproved: true, stylistRating: { $gt: 0 } } },
            { $group: { _id: null, avgRating: { $avg: "$stylistRating" } } }
        ]);

        const averageRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

        // Get top rated stylists
        const topRatedStylists = await StylistProfile.find({
            isApproved: true,
            stylistRating: { $gt: 0 }
        })
            .populate('userId', 'displayName email')
            .sort({ stylistRating: -1 })
            .limit(5)
            .select('stylistName stylistRating stylistCity stylistState');

        return res.status(200).json({
            success: true,
            message: "Stylist statistics retrieved successfully",
            data: {
                statistics: {
                    totalStylists,
                    approvedStylists,
                    pendingStylists,
                    rejectedStylists,
                    averageRating: Math.round(averageRating * 10) / 10
                },
                topRatedStylists
            }
        });

    } catch (error) {
        console.error("Error getting stylist statistics:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving stylist statistics",
            error: error.message
        });
    }
};
