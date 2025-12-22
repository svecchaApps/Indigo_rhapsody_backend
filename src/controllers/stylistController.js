const mongoose = require("mongoose");
const StylistProfile = require("../models/stylistProfile");
const StylistCategory = require("../models/stylistCategoryModel");
const StylistBooking = require("../models/stylistBooking");
const StylistAvailability = require("../models/stylistAvailability");
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

        // If no profile found, return dummy data
        if (!stylistProfile) {
            const dummyProfile = {
                _id: "507f1f77bcf86cd799439011",
                userId: {
                    _id: userId,
                    displayName: "Sarah Johnson",
                    email: "sarah.johnson@example.com",
                    phoneNumber: "+1234567890",
                    role: "Stylist",
                    profilePicture: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400"
                },
                stylistName: "Sarah's Fashion Studio",
                stylistEmail: "sarah.stylist@example.com",
                stylistPhone: "+1234567890",
                stylistAddress: "123 Fashion Street, Suite 4B",
                stylistCity: "Mumbai",
                stylistState: "Maharashtra",
                stylistPincode: "400001",
                stylistCountry: "India",
                stylistImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
                stylistBio: "Professional stylist with 8+ years of experience in fashion and personal styling. Specializing in wardrobe consulting, color analysis, and personal image transformation. I help clients discover their unique style and build confidence through fashion.",
                stylistPortfolio: [
                    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
                    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
                    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800",
                    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800",
                    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"
                ],
                stylistExperience: "8+ years in fashion styling, worked with celebrities, fashion brands, and helped over 500 clients transform their personal style. Former stylist at Vogue India and Elle Magazine.",
                stylistEducation: "Fashion Design Degree from National Institute of Fashion Technology (NIFT), Mumbai. Certified Personal Stylist from Style Academy, London.",
                stylistSkills: [
                    "Personal Styling",
                    "Wardrobe Consulting",
                    "Color Analysis",
                    "Body Type Analysis",
                    "Event Styling",
                    "Celebrity Styling",
                    "Fashion Photography Styling",
                    "Sustainable Fashion Consulting"
                ],
                stylistCategories: [
                    {
                        _id: "507f191e810c19729de860ea",
                        name: "Personal Styling",
                        description: "One-on-one personal styling services",
                        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400",
                        icon: "👗"
                    },
                    {
                        _id: "507f191e810c19729de860eb",
                        name: "Wardrobe Consulting",
                        description: "Professional wardrobe analysis and optimization",
                        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400",
                        icon: "👔"
                    }
                ],
                stylistAvailability: "Monday-Friday: 9:00 AM - 6:00 PM, Saturday: 10:00 AM - 4:00 PM, Sunday: Closed",
                stylistPrice: 2000,
                stylistRating: 4.8,
                stylistReviews: [
                    "Sarah transformed my entire wardrobe! Highly recommend.",
                    "Professional, friendly, and has an amazing eye for style.",
                    "Best stylist I've ever worked with. Worth every penny!"
                ],
                applicationStatus: "approved",
                isApproved: true,
                approvalStatus: "approved",
                bookingSettings: {
                    isAvailableForBooking: true,
                    minAdvanceBooking: 2,
                    maxAdvanceBooking: 30,
                    slotDuration: 60,
                    maxBookingsPerDay: 8,
                    bufferTime: 15,
                    cancellationPolicy: "moderate",
                    reschedulingPolicy: "flexible"
                },
                bookingStats: {
                    totalBookings: 127,
                    completedBookings: 115,
                    cancelledBookings: 12,
                    averageRating: 4.8,
                    totalEarnings: 230000,
                    lastBookingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
                },
                videoCallSettings: {
                    isVideoCallEnabled: true,
                    preferredVideoQuality: "high",
                    maxCallDuration: 120
                },
                createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
                updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            };

            return res.status(200).json({
                success: true,
                message: "Stylist profile retrieved successfully (dummy data - no actual profile found)",
                data: {
                    stylistProfile: dummyProfile,
                    isDummyData: true
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stylist profile retrieved successfully",
            data: {
                stylistProfile,
                isDummyData: false
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

// Get all stylist categories
exports.getStylistCategories = async (req, res) => {
    try {
        const { isActive } = req.query;
        
        let query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const categories = await StylistCategory.find(query)
            .sort({ displayOrder: 1, name: 1 });

        return res.status(200).json({
            success: true,
            message: "Stylist categories retrieved successfully",
            data: {
                categories,
                totalCategories: categories.length
            }
        });

    } catch (error) {
        console.error("Error getting stylist categories:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving stylist categories",
            error: error.message
        });
    }
};

// Get stylists by category
exports.getStylistsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const {
            page = 1,
            limit = 10,
            city = '',
            state = '',
            minRating = 0,
            maxPrice = null,
            sortBy = 'stylistRating',
            sortOrder = 'desc'
        } = req.query;

        // Validate categoryId
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID format"
            });
        }

        // Check if category exists
        const category = await StylistCategory.findOne({ 
            _id: categoryId, 
            isActive: true 
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found or inactive"
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        let query = {
            isApproved: true,
            approvalStatus: 'approved',
            applicationStatus: 'approved',
            'bookingSettings.isAvailableForBooking': true,
            stylistCategories: { $in: [new mongoose.Types.ObjectId(categoryId)] }
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
            message: `Stylists in category '${category.name}' retrieved successfully`,
            data: {
                category: {
                    _id: category._id,
                    name: category.name,
                    description: category.description,
                    image: category.image,
                    icon: category.icon
                },
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
        console.error("Error getting stylists by category:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving stylists by category",
            error: error.message
        });
    }
};

// Create stylist category (Admin only)
exports.createStylistCategory = async (req, res) => {
    try {
        const { name, description, image, icon, displayOrder } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        // Check if category already exists
        const existingCategory = await StylistCategory.findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category with this name already exists"
            });
        }

        const category = new StylistCategory({
            name: name.trim(),
            description: description || '',
            image: image || '',
            icon: icon || '',
            displayOrder: displayOrder || 0,
            isActive: true
        });

        await category.save();

        return res.status(201).json({
            success: true,
            message: "Stylist category created successfully",
            data: {
                category
            }
        });

    } catch (error) {
        console.error("Error creating stylist category:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating stylist category",
            error: error.message
        });
    }
};

/**
 * Get Top Stylists Algorithm
 * 
 * Scoring Algorithm:
 * 1. Booking Score (0-50 points):
 *    - Based on completed bookings count
 *    - Normalized to 0-50 scale
 *    - Formula: (completedBookings / maxBookings) * 50
 * 
 * 2. Rating Score (0-50 points):
 *    - Based on stylist rating (0-5 scale)
 *    - Normalized to 0-50 scale
 *    - Formula: (rating / 5) * 50
 * 
 * 3. Combined Score (0-100 points):
 *    - Total Score = Booking Score + Rating Score
 *    - Higher score = Better ranking
 * 
 * Additional Factors:
 * - Only approved stylists are considered
 * - Minimum 1 completed booking required
 * - Minimum rating of 0 (unrated stylists get 0 rating score)
 */
exports.getTopStylists = async (req, res) => {
    try {
        const {
            limit = 10,
            minBookings = 1,
            minRating = 0,
            categoryId = '',
            city = '',
            state = ''
        } = req.query;

        // Build base query for approved stylists only
        let query = {
            isApproved: true,
            approvalStatus: 'approved',
            applicationStatus: 'approved',
            'bookingSettings.isAvailableForBooking': true
        };

        // Additional filters
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            query.stylistCategories = { $in: [new mongoose.Types.ObjectId(categoryId)] };
        }

        if (city) {
            query.stylistCity = { $regex: city, $options: 'i' };
        }

        if (state) {
            query.stylistState = { $regex: state, $options: 'i' };
        }

        // Get all approved stylists matching filters
        const stylists = await StylistProfile.find(query)
            .populate('userId', 'displayName email phoneNumber profilePicture')
            .populate('stylistCategories', 'name description image icon');

        // Get booking statistics for each stylist
        const stylistsWithStats = await Promise.all(
            stylists.map(async (stylist) => {
                // Get completed bookings count
                const completedBookings = await StylistBooking.countDocuments({
                    stylistId: stylist._id,
                    status: 'completed',
                    paymentStatus: 'completed'
                });

                // Get total bookings count
                const totalBookings = await StylistBooking.countDocuments({
                    stylistId: stylist._id,
                    status: { $in: ['completed', 'confirmed', 'in_progress'] }
                });

                // Get average rating from bookings (if available)
                const ratingAggregation = await StylistBooking.aggregate([
                    {
                        $match: {
                            stylistId: stylist._id,
                            status: 'completed',
                            userRating: { $exists: true, $gt: 0 }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgRating: { $avg: '$userRating' },
                            ratingCount: { $sum: 1 }
                        }
                    }
                ]);

                // Use booking-based rating if available, otherwise use profile rating
                let finalRating = stylist.stylistRating || 0;
                let ratingCount = 0;
                
                if (ratingAggregation.length > 0 && ratingAggregation[0].avgRating) {
                    finalRating = ratingAggregation[0].avgRating;
                    ratingCount = ratingAggregation[0].ratingCount;
                }

                return {
                    stylist,
                    completedBookings,
                    totalBookings,
                    rating: finalRating,
                    ratingCount
                };
            })
        );

        // Filter by minimum requirements
        const filteredStylists = stylistsWithStats.filter(item => {
            return item.completedBookings >= parseInt(minBookings) &&
                   item.rating >= parseFloat(minRating);
        });

        // Find max bookings for normalization
        const maxBookings = Math.max(
            ...filteredStylists.map(item => item.completedBookings),
            1 // Prevent division by zero
        );

        // Calculate scores and rank
        const rankedStylists = filteredStylists.map(item => {
            // Booking Score (0-50 points)
            const bookingScore = (item.completedBookings / maxBookings) * 50;

            // Rating Score (0-50 points)
            // Normalize rating from 0-5 scale to 0-50 points
            const ratingScore = (item.rating / 5) * 50;

            // Combined Score (0-100 points)
            let combinedScore = bookingScore + ratingScore;

            // Boost score for top stylists (add 20 bonus points)
            if (item.stylist.isTopStylist) {
                combinedScore += 20;
            }

            return {
                stylistProfile: item.stylist,
                stats: {
                    completedBookings: item.completedBookings,
                    totalBookings: item.totalBookings,
                    rating: Math.round(item.rating * 10) / 10, // Round to 1 decimal
                    ratingCount: item.ratingCount
                },
                scores: {
                    bookingScore: Math.round(bookingScore * 100) / 100,
                    ratingScore: Math.round(ratingScore * 100) / 100,
                    combinedScore: Math.round(combinedScore * 100) / 100,
                    isTopStylist: item.stylist.isTopStylist || false
                },
                rank: 0 // Will be set after sorting
            };
        });

        // Sort by isTopStylist first, then by combined score (descending)
        rankedStylists.sort((a, b) => {
            // Top stylists first
            if (a.scores.isTopStylist && !b.scores.isTopStylist) return -1;
            if (!a.scores.isTopStylist && b.scores.isTopStylist) return 1;
            // Then by combined score
            return b.scores.combinedScore - a.scores.combinedScore;
        });

        // Assign ranks
        rankedStylists.forEach((item, index) => {
            item.rank = index + 1;
        });

        // Limit results
        const topStylists = rankedStylists.slice(0, parseInt(limit));

        // If no data found, return dummy data for testing/development
        if (topStylists.length === 0) {
            const dummyData = [
                {
                    rank: 1,
                    stylistProfile: {
                        _id: "507f1f77bcf86cd799439011",
                        userId: {
                            _id: "507f191e810c19729de860ea",
                            displayName: "Sarah Johnson",
                            email: "sarah.johnson@example.com",
                            phoneNumber: "+1234567890",
                            profilePicture: "https://example.com/profile1.jpg"
                        },
                        stylistName: "Sarah's Fashion Studio",
                        stylistEmail: "sarah.stylist@example.com",
                        stylistPhone: "+1234567890",
                        stylistAddress: "123 Fashion Street",
                        stylistCity: "Mumbai",
                        stylistState: "Maharashtra",
                        stylistPincode: "400001",
                        stylistCountry: "India",
                        stylistImage: "https://example.com/stylist1.jpg",
                        stylistBio: "Professional stylist with 8+ years of experience in personal styling and wardrobe consulting",
                        stylistPortfolio: [
                            "https://example.com/portfolio1.jpg",
                            "https://example.com/portfolio2.jpg",
                            "https://example.com/portfolio3.jpg"
                        ],
                        stylistExperience: "8+ years in fashion styling",
                        stylistEducation: "Fashion Design Degree from FIT",
                        stylistSkills: ["Personal Styling", "Wardrobe Consulting", "Color Analysis"],
                        stylistCategories: [
                            {
                                _id: "507f1f77bcf86cd799439012",
                                name: "Personal Styling",
                                description: "One-on-one personal styling services",
                                image: "https://example.com/category1.jpg",
                                icon: "https://example.com/icon1.svg"
                            }
                        ],
                        stylistAvailability: "Monday-Friday: 9AM-6PM, Saturday: 10AM-4PM",
                        stylistPrice: 3500,
                        stylistRating: 4.8,
                        isApproved: true,
                        approvalStatus: "approved"
                    },
                    stats: {
                        completedBookings: 150,
                        totalBookings: 180,
                        rating: 4.8,
                        ratingCount: 120
                    },
                    scores: {
                        bookingScore: 50.0,
                        ratingScore: 48.0,
                        combinedScore: 98.0
                    }
                },
                {
                    rank: 2,
                    stylistProfile: {
                        _id: "507f1f77bcf86cd799439012",
                        userId: {
                            _id: "507f191e810c19729de860eb",
                            displayName: "Michael Chen",
                            email: "michael.chen@example.com",
                            phoneNumber: "+1234567891",
                            profilePicture: "https://example.com/profile2.jpg"
                        },
                        stylistName: "Michael's Style Lab",
                        stylistEmail: "michael.stylist@example.com",
                        stylistPhone: "+1234567891",
                        stylistAddress: "456 Style Avenue",
                        stylistCity: "Mumbai",
                        stylistState: "Maharashtra",
                        stylistPincode: "400002",
                        stylistCountry: "India",
                        stylistImage: "https://example.com/stylist2.jpg",
                        stylistBio: "Award-winning stylist specializing in contemporary fashion and trend forecasting",
                        stylistPortfolio: [
                            "https://example.com/portfolio4.jpg",
                            "https://example.com/portfolio5.jpg"
                        ],
                        stylistExperience: "6+ years in fashion styling",
                        stylistEducation: "Fashion Marketing Degree",
                        stylistSkills: ["Trend Forecasting", "Event Styling", "Celebrity Styling"],
                        stylistCategories: [
                            {
                                _id: "507f1f77bcf86cd799439013",
                                name: "Event Styling",
                                description: "Professional event styling services",
                                image: "https://example.com/category2.jpg",
                                icon: "https://example.com/icon2.svg"
                            }
                        ],
                        stylistAvailability: "Monday-Saturday: 10AM-7PM",
                        stylistPrice: 4000,
                        stylistRating: 4.7,
                        isApproved: true,
                        approvalStatus: "approved"
                    },
                    stats: {
                        completedBookings: 120,
                        totalBookings: 150,
                        rating: 4.7,
                        ratingCount: 95
                    },
                    scores: {
                        bookingScore: 40.0,
                        ratingScore: 47.0,
                        combinedScore: 87.0
                    }
                },
                {
                    rank: 3,
                    stylistProfile: {
                        _id: "507f1f77bcf86cd799439013",
                        userId: {
                            _id: "507f191e810c19729de860ec",
                            displayName: "Emma Williams",
                            email: "emma.williams@example.com",
                            phoneNumber: "+1234567892",
                            profilePicture: "https://example.com/profile3.jpg"
                        },
                        stylistName: "Emma's Wardrobe Consulting",
                        stylistEmail: "emma.stylist@example.com",
                        stylistPhone: "+1234567892",
                        stylistAddress: "789 Fashion Lane",
                        stylistCity: "Delhi",
                        stylistState: "Delhi",
                        stylistPincode: "110001",
                        stylistCountry: "India",
                        stylistImage: "https://example.com/stylist3.jpg",
                        stylistBio: "Expert in wardrobe optimization and sustainable fashion styling",
                        stylistPortfolio: [
                            "https://example.com/portfolio6.jpg",
                            "https://example.com/portfolio7.jpg",
                            "https://example.com/portfolio8.jpg"
                        ],
                        stylistExperience: "5+ years in fashion styling",
                        stylistEducation: "Textile Design Degree",
                        stylistSkills: ["Wardrobe Consulting", "Sustainable Fashion", "Body Type Analysis"],
                        stylistCategories: [
                            {
                                _id: "507f1f77bcf86cd799439014",
                                name: "Wardrobe Consulting",
                                description: "Professional wardrobe consultation services",
                                image: "https://example.com/category3.jpg",
                                icon: "https://example.com/icon3.svg"
                            }
                        ],
                        stylistAvailability: "Tuesday-Saturday: 11AM-6PM",
                        stylistPrice: 3000,
                        stylistRating: 4.6,
                        isApproved: true,
                        approvalStatus: "approved"
                    },
                    stats: {
                        completedBookings: 95,
                        totalBookings: 120,
                        rating: 4.6,
                        ratingCount: 75
                    },
                    scores: {
                        bookingScore: 31.67,
                        ratingScore: 46.0,
                        combinedScore: 77.67
                    }
                },
                {
                    rank: 4,
                    stylistProfile: {
                        _id: "507f1f77bcf86cd799439014",
                        userId: {
                            _id: "507f191e810c19729de860ed",
                            displayName: "David Kumar",
                            email: "david.kumar@example.com",
                            phoneNumber: "+1234567893",
                            profilePicture: "https://example.com/profile4.jpg"
                        },
                        stylistName: "David's Style House",
                        stylistEmail: "david.stylist@example.com",
                        stylistPhone: "+1234567893",
                        stylistAddress: "321 Style Boulevard",
                        stylistCity: "Bangalore",
                        stylistState: "Karnataka",
                        stylistPincode: "560001",
                        stylistCountry: "India",
                        stylistImage: "https://example.com/stylist4.jpg",
                        stylistBio: "Specialized in men's fashion and corporate styling",
                        stylistPortfolio: [
                            "https://example.com/portfolio9.jpg",
                            "https://example.com/portfolio10.jpg"
                        ],
                        stylistExperience: "7+ years in fashion styling",
                        stylistEducation: "Fashion Design and Business Degree",
                        stylistSkills: ["Men's Fashion", "Corporate Styling", "Grooming"],
                        stylistCategories: [
                            {
                                _id: "507f1f77bcf86cd799439015",
                                name: "Men's Fashion",
                                description: "Specialized men's fashion styling",
                                image: "https://example.com/category4.jpg",
                                icon: "https://example.com/icon4.svg"
                            }
                        ],
                        stylistAvailability: "Monday-Friday: 9AM-5PM",
                        stylistPrice: 3500,
                        stylistRating: 4.5,
                        isApproved: true,
                        approvalStatus: "approved"
                    },
                    stats: {
                        completedBookings: 80,
                        totalBookings: 100,
                        rating: 4.5,
                        ratingCount: 60
                    },
                    scores: {
                        bookingScore: 26.67,
                        ratingScore: 45.0,
                        combinedScore: 71.67
                    }
                },
                {
                    rank: 5,
                    stylistProfile: {
                        _id: "507f1f77bcf86cd799439015",
                        userId: {
                            _id: "507f191e810c19729de860ee",
                            displayName: "Priya Sharma",
                            email: "priya.sharma@example.com",
                            phoneNumber: "+1234567894",
                            profilePicture: "https://example.com/profile5.jpg"
                        },
                        stylistName: "Priya's Fashion Boutique",
                        stylistEmail: "priya.stylist@example.com",
                        stylistPhone: "+1234567894",
                        stylistAddress: "654 Fashion Plaza",
                        stylistCity: "Mumbai",
                        stylistState: "Maharashtra",
                        stylistPincode: "400003",
                        stylistCountry: "India",
                        stylistImage: "https://example.com/stylist5.jpg",
                        stylistBio: "Expert in traditional and contemporary Indian fashion fusion",
                        stylistPortfolio: [
                            "https://example.com/portfolio11.jpg",
                            "https://example.com/portfolio12.jpg",
                            "https://example.com/portfolio13.jpg"
                        ],
                        stylistExperience: "9+ years in fashion styling",
                        stylistEducation: "Fashion Design and Indian Textiles Degree",
                        stylistSkills: ["Indian Fashion", "Bridal Styling", "Traditional Wear"],
                        stylistCategories: [
                            {
                                _id: "507f1f77bcf86cd799439016",
                                name: "Bridal Styling",
                                description: "Specialized bridal styling services",
                                image: "https://example.com/category5.jpg",
                                icon: "https://example.com/icon5.svg"
                            }
                        ],
                        stylistAvailability: "Monday-Sunday: 10AM-8PM",
                        stylistPrice: 5000,
                        stylistRating: 4.9,
                        isApproved: true,
                        approvalStatus: "approved"
                    },
                    stats: {
                        completedBookings: 200,
                        totalBookings: 220,
                        rating: 4.9,
                        ratingCount: 180
                    },
                    scores: {
                        bookingScore: 50.0,
                        ratingScore: 49.0,
                        combinedScore: 99.0
                    }
                }
            ];

            // Limit dummy data to requested limit
            const limitedDummyData = dummyData.slice(0, parseInt(limit));

            return res.status(200).json({
                success: true,
                message: "Top stylists retrieved successfully (dummy data - no actual data found)",
                data: {
                    topStylists: limitedDummyData,
                    totalFound: limitedDummyData.length,
                    isDummyData: true,
                    algorithm: {
                        description: "Combined scoring algorithm based on bookings and ratings",
                        bookingWeight: "50% (0-50 points)",
                        ratingWeight: "50% (0-50 points)",
                        maxScore: 100,
                        factors: [
                            "Completed bookings count",
                            "Stylist rating (0-5 scale)",
                            "Only approved stylists",
                            "Minimum booking and rating filters applied"
                        ]
                    }
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Top stylists retrieved successfully",
            data: {
                topStylists,
                totalFound: rankedStylists.length,
                isDummyData: false,
                algorithm: {
                    description: "Combined scoring algorithm based on bookings and ratings",
                    bookingWeight: "50% (0-50 points)",
                    ratingWeight: "50% (0-50 points)",
                    maxScore: 100,
                    factors: [
                        "Completed bookings count",
                        "Stylist rating (0-5 scale)",
                        "Only approved stylists",
                        "Minimum booking and rating filters applied"
                    ]
                }
            }
        });

    } catch (error) {
        console.error("Error getting top stylists:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving top stylists",
            error: error.message
        });
    }
};

// Test endpoint: Create stylist profile (public, for testing purposes)
exports.createTestStylistProfile = async (req, res) => {
    try {
        const {
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
            stylistAvailability,
            stylistPrice,
            stylistCategories,
            autoApprove = false,
            isTopStylist = false,
            bookingStats
        } = req.body;

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

        // Handle userId - create user if not provided
        let userObjectId = null;
        let createdUser = false;
        
        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid userId format"
                });
            }
            userObjectId = new mongoose.Types.ObjectId(userId);
            
            // Check if user exists
            const existingUser = await User.findById(userObjectId);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found with provided userId"
                });
            }
            
            // Check if user already has a stylist profile
            const existingProfile = await StylistProfile.findOne({ userId: userObjectId });
            if (existingProfile) {
                return res.status(400).json({
                    success: false,
                    message: "Stylist profile already exists for this user"
                });
            }
        } else {
            // Create a new user for the stylist
            const newUser = new User({
                displayName: stylistName,
                email: stylistEmail,
                phoneNumber: stylistPhone,
                role: "Stylist",
                is_creator: false
            });
            
            await newUser.save();
            userObjectId = newUser._id;
            createdUser = true;
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
        if (stylistCategories && Array.isArray(stylistCategories)) {
            for (const catId of stylistCategories) {
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
            userId: userObjectId,
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
            stylistRating: bookingStats?.averageRating || 4.5,
            stylistReviews: [],
            isApproved: autoApprove,
            approvalStatus: autoApprove ? "approved" : "pending",
            applicationStatus: autoApprove ? "approved" : "draft",
            isTopStylist: isTopStylist,
            bookingStats: bookingStats || {
                totalBookings: 0,
                completedBookings: 0,
                cancelledBookings: 0,
                averageRating: 0,
                totalEarnings: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await stylistProfile.save();

        // Populate user details and categories
        if (userObjectId) {
            await stylistProfile.populate('userId', 'displayName email phoneNumber role');
        }
        await stylistProfile.populate('stylistCategories', 'name description image icon');

        return res.status(201).json({
            success: true,
            message: "Test stylist profile created successfully",
            data: {
                stylistProfile,
                userId: userObjectId,
                userCreated: createdUser,
                isTestData: true
            }
        });

    } catch (error) {
        console.error("Error creating test stylist profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating test stylist profile",
            error: error.message
        });
    }
};

// Mark/unmark stylist as top stylist
exports.markAsTopStylist = async (req, res) => {
    try {
        const { stylistId } = req.params;
        const { isTopStylist = true } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(stylistId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid stylist ID format"
            });
        }

        // Find stylist profile
        const stylistProfile = await StylistProfile.findById(stylistId);

        if (!stylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        // Update isTopStylist status
        stylistProfile.isTopStylist = isTopStylist;
        stylistProfile.updatedAt = new Date();
        await stylistProfile.save();

        // Populate for response
        await stylistProfile.populate('userId', 'displayName email phoneNumber role');
        await stylistProfile.populate('stylistCategories', 'name description image icon');

        return res.status(200).json({
            success: true,
            message: `Stylist ${isTopStylist ? 'marked as' : 'removed from'} top stylist successfully`,
            data: {
                stylistProfile
            }
        });

    } catch (error) {
        console.error("Error marking stylist as top:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating top stylist status",
            error: error.message
        });
    }
};

// Create or update stylist availability
exports.createOrUpdateAvailability = async (req, res) => {
    try {
        // Get stylistId from params, body, or user (if authenticated)
        const { stylistId } = req.params;
        const stylistIdFromBody = req.body.stylistId;
        const userIdFromAuth = req.user ? req.user._id : null;

        let targetStylistId = null;
        let targetStylistProfile = null;

        // Priority: params > body > authenticated user
        if (stylistId) {
            if (!mongoose.Types.ObjectId.isValid(stylistId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }
            targetStylistProfile = await StylistProfile.findById(stylistId);
            if (targetStylistProfile) {
                targetStylistId = targetStylistProfile._id;
            }
        } else if (stylistIdFromBody) {
            if (!mongoose.Types.ObjectId.isValid(stylistIdFromBody)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }
            targetStylistProfile = await StylistProfile.findById(stylistIdFromBody);
            if (targetStylistProfile) {
                targetStylistId = targetStylistProfile._id;
            }
        } else if (userIdFromAuth) {
            // Find stylist profile by userId
            targetStylistProfile = await StylistProfile.findOne({ userId: userIdFromAuth });
            if (targetStylistProfile) {
                targetStylistId = targetStylistProfile._id;
            }
        }

        if (!targetStylistId || !targetStylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        const {
            weeklySchedule,
            dateOverrides = [],
            bookingPreferences = {},
            timezone = 'Asia/Kolkata',
            isActive = true
        } = req.body;

        // Validate weeklySchedule if provided
        if (weeklySchedule) {
            const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
            
            for (const day of validDays) {
                if (weeklySchedule[day]) {
                    const daySchedule = weeklySchedule[day];
                    
                    // Validate startTime and endTime if provided
                    if (daySchedule.startTime && daySchedule.endTime) {
                        if (!timeRegex.test(daySchedule.startTime) || !timeRegex.test(daySchedule.endTime)) {
                            return res.status(400).json({
                                success: false,
                                message: `Invalid time format for ${day}. Use HH:MM format (24-hour)`
                            });
                        }
                    }
                    
                    // Validate slots if provided
                    if (daySchedule.slots && Array.isArray(daySchedule.slots)) {
                        for (let i = 0; i < daySchedule.slots.length; i++) {
                            const slot = daySchedule.slots[i];
                            if (!slot.startTime || !slot.endTime) {
                                return res.status(400).json({
                                    success: false,
                                    message: `Slot ${i + 1} for ${day} must have startTime and endTime`
                                });
                            }
                            if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
                                return res.status(400).json({
                                    success: false,
                                    message: `Invalid time format in slot ${i + 1} for ${day}. Use HH:MM format (24-hour)`
                                });
                            }
                            // Validate that endTime is after startTime
                            const [startHour, startMin] = slot.startTime.split(':').map(Number);
                            const [endHour, endMin] = slot.endTime.split(':').map(Number);
                            const startMinutes = startHour * 60 + startMin;
                            const endMinutes = endHour * 60 + endMin;
                            
                            if (endMinutes <= startMinutes) {
                                return res.status(400).json({
                                    success: false,
                                    message: `Slot ${i + 1} for ${day}: endTime must be after startTime`
                                });
                            }
                        }
                    }
                }
            }
        }

        // Find or create availability record
        let availability = await StylistAvailability.findOne({ stylistId: targetStylistId });

        if (!availability) {
            availability = new StylistAvailability({
                stylistId: targetStylistId
            });
        }

        // Update availability settings
        if (weeklySchedule) {
            availability.weeklySchedule = weeklySchedule;
        }
        if (dateOverrides && Array.isArray(dateOverrides)) {
            availability.dateOverrides = dateOverrides.map(override => ({
                ...override,
                date: new Date(override.date)
            }));
        }
        if (bookingPreferences && Object.keys(bookingPreferences).length > 0) {
            availability.bookingPreferences = {
                ...availability.bookingPreferences,
                ...bookingPreferences
            };
        }
        if (timezone) {
            availability.timezone = timezone;
        }
        availability.isActive = isActive;
        availability.updatedAt = new Date();

        await availability.save();

        // Populate stylist information
        await availability.populate({
            path: 'stylistId',
            select: 'stylistName stylistImage stylistBio stylistCity stylistState stylistPhone stylistEmail stylistPrice',
            populate: {
                path: 'userId',
                select: 'displayName email phoneNumber profilePicture'
            }
        });

        return res.status(200).json({
            success: true,
            message: "Availability created/updated successfully",
            data: {
                availability,
                stylistInfo: {
                    stylistId: targetStylistProfile._id,
                    stylistName: targetStylistProfile.stylistName,
                    stylistImage: targetStylistProfile.stylistImage,
                    stylistCity: targetStylistProfile.stylistCity,
                    stylistState: targetStylistProfile.stylistState
                }
            }
        });

    } catch (error) {
        console.error("Error creating/updating availability:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating/updating availability",
            error: error.message
        });
    }
};

// Get stylist availability with stylist information
exports.getAvailabilityWithStylistInfo = async (req, res) => {
    try {
        // Get stylistId from params or query
        const { stylistId } = req.params;
        const stylistIdFromQuery = req.query.stylistId;
        const userIdFromQuery = req.query.userId;

        let targetStylistId = null;
        let targetStylistProfile = null;

        // Priority: params > query.stylistId > query.userId
        if (stylistId) {
            if (!mongoose.Types.ObjectId.isValid(stylistId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }
            targetStylistProfile = await StylistProfile.findById(stylistId);
            if (targetStylistProfile) {
                targetStylistId = targetStylistProfile._id;
            }
        } else if (stylistIdFromQuery) {
            if (!mongoose.Types.ObjectId.isValid(stylistIdFromQuery)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid stylist ID format"
                });
            }
            targetStylistProfile = await StylistProfile.findById(stylistIdFromQuery);
            if (targetStylistProfile) {
                targetStylistId = targetStylistProfile._id;
            }
        } else if (userIdFromQuery) {
            if (!mongoose.Types.ObjectId.isValid(userIdFromQuery)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID format"
                });
            }
            targetStylistProfile = await StylistProfile.findOne({ userId: userIdFromQuery });
            if (targetStylistProfile) {
                targetStylistId = targetStylistProfile._id;
            }
        }

        if (!targetStylistId || !targetStylistProfile) {
            return res.status(404).json({
                success: false,
                message: "Stylist profile not found"
            });
        }

        // Get availability
        let availability = await StylistAvailability.findOne({ stylistId: targetStylistId })
            .populate({
                path: 'stylistId',
                select: 'stylistName stylistImage stylistBio stylistCity stylistState stylistPhone stylistEmail stylistPrice stylistRating stylistAvailability',
                populate: {
                    path: 'userId',
                    select: 'displayName email phoneNumber profilePicture'
                }
            });

        // If no availability found, return stylist info with default availability structure
        if (!availability) {
            // Populate stylist profile
            await targetStylistProfile.populate('userId', 'displayName email phoneNumber profilePicture');
            await targetStylistProfile.populate('stylistCategories', 'name description image icon');

            return res.status(200).json({
                success: true,
                message: "Stylist information retrieved (no availability set yet)",
                data: {
                    stylistProfile: targetStylistProfile,
                    availability: null,
                    hasAvailability: false
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Availability with stylist information retrieved successfully",
            data: {
                availability,
                stylistProfile: availability.stylistId,
                hasAvailability: true
            }
        });

    } catch (error) {
        console.error("Error getting availability with stylist info:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving availability",
            error: error.message
        });
    }
};
