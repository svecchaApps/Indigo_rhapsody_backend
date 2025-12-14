const User = require("../models/userModel");
const StylistProfile = require("../models/stylistProfile");
const { admin } = require("../service/firebaseServices");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Store refresh tokens (in production, use Redis or database)
const refreshTokens = new Set();

// Generate JWT Token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Generate Refresh Token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

// Send Welcome Email
const sendWelcomeEmail = async (email, displayName) => {
  try {
    const transporter = nodemailer.createTransporter({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: "info@indigorhapsody.com",
        pass: "InfoPassword123#@",
      },
    });

    const mailOptions = {
      from: '"Indigo Rhapsody" <info@indigorhapsody.com>',
      to: email,
      subject: "Welcome to Indigo Rhapsody Mobile Application",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 20px 20px; text-align: center;">
              <div style="display: inline-block; width: 60px; height: 60px; background-color: #0d47a1; color: white; font-size: 24px; font-weight: bold; line-height: 60px; text-align: center; margin-bottom: 10px;">
                <img src="https://firebasestorage.googleapis.com/v0/b/sveccha-11c31.appspot.com/o/Logo.png?alt=media&token=c8b4c22d-8256-4092-8b46-e89e001bd1fe" alt="Welcome illustration" style="max-width: 700px; width: 100%; height: auto; display: block; margin: 0 auto;">
              </div>
              <div style="font-size: 12px; color: #666666; letter-spacing: 2px; margin-top: 5px;">
                INDIGO RHAPSODY<br>
                <span style="font-size: 10px;">MOBILE EXPERIENCE</span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <h2 style="margin: 0 0 10px; font-size: 16px; color: #666666; font-weight: normal; letter-spacing: 1px;">Hello, ${displayName}</h2>
              <h1 style="margin: 0 0 20px; font-size: 32px; color: #0d47a1; font-weight: bold; line-height: 1.2;">Nice to meet you!</h1>
              <p style="margin: 0 0 30px; font-size: 16px; color: #666666; line-height: 1.5;">Welcome to Indigo Rhapsody. We are very happy to have you with us.</p>
              <p style="margin: 0 0 30px; font-size: 18px; color: #0d47a1; font-weight: 500;">Enjoy your journey with Us</p>
              <a href="https://indigorhapsody.com" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-size: 16px; font-weight: 500; letter-spacing: 1px;">VISIT WEBSITE</a>
            </td>
          </tr>

          <!-- Illustration -->
          <tr>
            <td style="padding: 40px 20px; text-align: center;">
              <img src="https://firebasestorage.googleapis.com/v0/b/popandpose-1ea69.firebasestorage.app/o/images%2FChatGPT%20Image%20Jun%202%2C%202025%2C%2004_18_45%20PM.png?alt=media&token=088a409e-e20a-4900-9012-5ae37c0e5b86" alt="Welcome illustration" style="max-width: 700px; width: 100%; height: auto; display: block; margin: 0 auto;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f8f9fa;">
              <p style="margin: 0; font-size: 14px; color: #666666;">© 2024 Indigo Rhapsody. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

// POST /auth/register - User registration with phone verification
exports.register = async (req, res) => {
  try {
    const {
      displayName,
      phoneNumber,
      email,
      firebaseIdToken,
      role = "User",
      is_creator = false,
      address,
    } = req.body;

    // Validate required fields
    if (!displayName || !phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Display name, phone number, and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Check if user already exists by phone number
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this phone number",
      });
    }

    // Create new user
    const newUser = new User({
      displayName,
      phoneNumber,
      email,
      firebaseUid: decodedToken.uid,
      role,
      is_creator,
      address: address || [],
    });

    await newUser.save();

    // Generate tokens
    const tokenPayload = {
      id: newUser._id,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      is_creator: newUser.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Send welcome SMS (optional)
    // await sendWelcomeSMS(phoneNumber, displayName);

    // Return user data and tokens
    const userResponse = {
      _id: newUser._id,
      displayName: newUser.displayName,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      is_creator: newUser.is_creator,
      address: newUser.address,
      createdAt: newUser.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// POST /auth/login - User login with Firebase phone verification
exports.login = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    // Validate required fields
    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    // Update Firebase UID if not set
    if (!user.firebaseUid) {
      user.firebaseUid = decodedToken.uid;
      await user.save();
    }

    // Generate tokens
    const tokenPayload = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Return user data and tokens
    const userResponse = {
      _id: user._id,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

// POST /auth/refresh - Token refresh
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Check if refresh token exists in storage
    if (!refreshTokens.has(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new tokens
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
      is_creator: user.is_creator,
    };

    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Remove old refresh token and add new one
    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: error.message,
    });
  }
};

// POST /auth/logout - User logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove refresh token from storage
      refreshTokens.delete(refreshToken);
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

// GET /auth/verify - Token verification
exports.verify = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      user: userResponse,
      tokenData: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        is_creator: decoded.is_creator,
        iat: decoded.iat,
        exp: decoded.exp,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Token verification failed",
      error: error.message,
    });
  }
};

// GET /auth/profile - Get user profile (protected route)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

// PUT /auth/profile - Update user profile (protected route)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, phoneNumber, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (displayName) user.displayName = displayName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;

    await user.save();

    // Return updated user data (without password)
    const userResponse = {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// POST /auth/verify-phone - Verify phone number with Firebase
exports.verifyPhone = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Check if user exists
    const user = await User.findOne({ phoneNumber });
    const isNewUser = !user;

    return res.status(200).json({
      success: true,
      message: "Phone verification successful",
      isNewUser,
      phoneNumber: decodedToken.phone_number,
      firebaseUid: decodedToken.uid,
    });
  } catch (error) {
    console.error("Phone verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Phone verification failed",
      error: error.message,
    });
  }
};

// POST /auth/admin-login - Admin login with email and password
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is an admin
    if (user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Check if user has a password (for admin users)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Admin account not properly configured. Please contact system administrator.",
      });
    }

    // Verify password (assuming bcrypt is used for password hashing)
    const bcrypt = require("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login time
    user.last_logged_in = new Date();
    await user.save();

    // Generate tokens
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
      is_creator: user.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Return admin data and tokens
    const adminResponse = {
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      is_creator: user.is_creator,
      last_logged_in: user.last_logged_in,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      user: adminResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin login failed",
      error: error.message,
    });
  }
};

// POST /auth/create-admin - Create admin user (protected, only super admin can access)
exports.createAdmin = async (req, res) => {
  try {
    const { displayName, email, password, phoneNumber } = req.body;

    // Validate required fields
    if (!displayName || !email || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Display name, email, password, and phone number are required",
      });
    }

    // Check if user already exists by email or phone
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or phone number",
      });
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new admin user
    const newAdmin = new User({
      displayName,
      email,
      phoneNumber,
      password: hashedPassword,
      role: "Admin",
      is_creator: false,
    });

    await newAdmin.save();

    // Return admin data (without password)
    const adminResponse = {
      _id: newAdmin._id,
      displayName: newAdmin.displayName,
      email: newAdmin.email,
      phoneNumber: newAdmin.phoneNumber,
      role: newAdmin.role,
      is_creator: newAdmin.is_creator,
      createdAt: newAdmin.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      user: adminResponse,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create admin user",
      error: error.message,
    });
  }
};

// POST /auth/stylist-signup - Stylist registration with Firebase
exports.stylistSignup = async (req, res) => {
  try {
    const {
      displayName,
      phoneNumber,
      email,
      firebaseIdToken,
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
      stylistPortfolio = [],
      stylistExperience,
      stylistEducation,
      stylistSkills = [],
      stylistAvailability,
      stylistPrice,
      address,
    } = req.body;

    // Validate required fields
    if (!displayName || !phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Display name, phone number, and Firebase ID token are required",
      });
    }

    // Validate stylist-specific required fields
    if (!stylistName || !stylistEmail || !stylistPhone || !stylistAddress || 
        !stylistCity || !stylistState || !stylistPincode || !stylistCountry || 
        !stylistImage || !stylistBio || !stylistExperience || !stylistEducation || 
        !stylistAvailability) {
      return res.status(400).json({
        success: false,
        message: "All stylist profile fields are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Check if user already exists by phone number
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this phone number",
      });
    }

    // Check if stylist profile already exists with this email or phone
    const existingStylist = await StylistProfile.findOne({
      $or: [
        { stylistEmail: stylistEmail },
        { stylistPhone: stylistPhone }
      ]
    });
    if (existingStylist) {
      return res.status(400).json({
        success: false,
        message: "Stylist profile already exists with this email or phone number",
      });
    }

    // Create new user with Stylist role
    const newUser = new User({
      displayName,
      phoneNumber,
      email: email || stylistEmail,
      firebaseUid: decodedToken.uid,
      role: "Stylist",
      is_creator: true,
      address: address || [],
    });

    await newUser.save();

    // Create stylist profile
    const newStylistProfile = new StylistProfile({
      userId: newUser._id,
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
      stylistPrice: stylistPrice || 0,
      applicationStatus: 'submitted',
      isApproved: false,
      approvalStatus: 'pending',
    });

    await newStylistProfile.save();

    // Generate tokens
    const tokenPayload = {
      id: newUser._id,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      is_creator: newUser.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Return user data and tokens
    const userResponse = {
      _id: newUser._id,
      displayName: newUser.displayName,
      phoneNumber: newUser.phoneNumber,
      email: newUser.email,
      role: newUser.role,
      is_creator: newUser.is_creator,
      address: newUser.address,
      createdAt: newUser.createdAt,
    };

    const stylistResponse = {
      _id: newStylistProfile._id,
      stylistName: newStylistProfile.stylistName,
      stylistEmail: newStylistProfile.stylistEmail,
      stylistPhone: newStylistProfile.stylistPhone,
      applicationStatus: newStylistProfile.applicationStatus,
      approvalStatus: newStylistProfile.approvalStatus,
      isApproved: newStylistProfile.isApproved,
    };

    return res.status(201).json({
      success: true,
      message: "Stylist registered successfully. Your application is pending approval.",
      user: userResponse,
      stylistProfile: stylistResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Stylist signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Stylist registration failed",
      error: error.message,
    });
  }
};

// POST /auth/stylist-login - Stylist login with Firebase
exports.stylistLogin = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    // Validate required fields
    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    // Check if user is a stylist
    if (user.role !== "Stylist") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This account is not registered as a stylist.",
      });
    }

    // Update Firebase UID if not set
    if (!user.firebaseUid) {
      user.firebaseUid = decodedToken.uid;
      await user.save();
    }

    // Find stylist profile
    const stylistProfile = await StylistProfile.findOne({ userId: user._id });
    if (!stylistProfile) {
      return res.status(404).json({
        success: false,
        message: "Stylist profile not found. Please complete your profile setup.",
      });
    }

    // Generate tokens
    const tokenPayload = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Return user data and tokens
    const userResponse = {
      _id: user._id,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    const stylistResponse = {
      _id: stylistProfile._id,
      stylistName: stylistProfile.stylistName,
      stylistEmail: stylistProfile.stylistEmail,
      stylistPhone: stylistProfile.stylistPhone,
      stylistImage: stylistProfile.stylistImage,
      stylistBio: stylistProfile.stylistBio,
      applicationStatus: stylistProfile.applicationStatus,
      approvalStatus: stylistProfile.approvalStatus,
      isApproved: stylistProfile.isApproved,
      bookingSettings: stylistProfile.bookingSettings,
    };

    return res.status(200).json({
      success: true,
      message: "Stylist login successful",
      user: userResponse,
      stylistProfile: stylistResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Stylist login error:", error);
    return res.status(500).json({
      success: false,
      message: "Stylist login failed",
      error: error.message,
    });
  }
};

// POST /auth/user-login-check - Check if user exists by phone number with Firebase verification
exports.userLoginCheck = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    // Validate required fields
    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token to ensure OTP is verified
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token. Please verify OTP first.",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      // User doesn't exist - new user needs to sign up
      return res.status(200).json({
        success: true,
        message: "User not found. Please sign up.",
        isNewUser: true,
        userId: null,
        phoneNumber: phoneNumber,
        firebaseUid: decodedToken.uid,
      });
    }

    // User exists - return user ID
    return res.status(200).json({
      success: true,
      message: "User found",
      isNewUser: false,
      userId: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      firebaseUid: decodedToken.uid,
    });
  } catch (error) {
    console.error("User login check error:", error);
    return res.status(500).json({
      success: false,
      message: "User login check failed",
      error: error.message,
    });
  }
};

// POST /auth/stylist-login-check - Check if stylist exists by phone number with Firebase verification
exports.stylistLoginCheck = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    // Validate required fields
    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token to ensure OTP is verified
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token. Please verify OTP first.",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      // User doesn't exist - new stylist needs to sign up
      return res.status(200).json({
        success: true,
        message: "Stylist not found. Please sign up.",
        isNewUser: true,
        userId: null,
        phoneNumber: phoneNumber,
        firebaseUid: decodedToken.uid,
      });
    }

    // Check if user is a stylist
    if (user.role !== "Stylist") {
      return res.status(200).json({
        success: true,
        message: "User exists but is not a stylist. Please sign up as stylist.",
        isNewUser: true,
        userId: null,
        phoneNumber: phoneNumber,
        existingUserRole: user.role,
        firebaseUid: decodedToken.uid,
      });
    }

    // Find stylist profile
    const stylistProfile = await StylistProfile.findOne({ userId: user._id });

    // Stylist exists - return user ID
    return res.status(200).json({
      success: true,
      message: "Stylist found",
      isNewUser: false,
      userId: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      hasStylistProfile: !!stylistProfile,
      stylistProfileId: stylistProfile ? stylistProfile._id : null,
      firebaseUid: decodedToken.uid,
    });
  } catch (error) {
    console.error("Stylist login check error:", error);
    return res.status(500).json({
      success: false,
      message: "Stylist login check failed",
      error: error.message,
    });
  }
};

// POST /auth/user-login - User login with phone number and Firebase token
exports.userLogin = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    // Validate required fields
    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please sign up first.",
        isNewUser: true,
      });
    }

    // Check if user is a regular user (not stylist or admin)
    if (user.role === "Stylist") {
      return res.status(403).json({
        success: false,
        message: "This phone number is registered as a stylist. Please use stylist login.",
      });
    }

    // Update Firebase UID if not set
    if (!user.firebaseUid) {
      user.firebaseUid = decodedToken.uid;
      await user.save();
    }

    // Update last login time
    user.last_logged_in = new Date();
    await user.save();

    // Generate tokens
    const tokenPayload = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Return user data and tokens
    const userResponse = {
      _id: user._id,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "User login successful",
      user: userResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("User login error:", error);
    return res.status(500).json({
      success: false,
      message: "User login failed",
      error: error.message,
    });
  }
};

// POST /auth/stylist-login-new - Stylist login with phone number and Firebase token
exports.stylistLoginNew = async (req, res) => {
  try {
    const { phoneNumber, firebaseIdToken } = req.body;

    // Validate required fields
    if (!phoneNumber || !firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and Firebase ID token are required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase ID token",
        error: firebaseError.message,
      });
    }

    // Check if phone number matches the verified token
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match verified token",
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Stylist not found. Please sign up first.",
        isNewUser: true,
      });
    }

    // Check if user is a stylist
    if (user.role !== "Stylist") {
      return res.status(403).json({
        success: false,
        message: "This phone number is not registered as a stylist. Please use user login or sign up as stylist.",
      });
    }

    // Update Firebase UID if not set
    if (!user.firebaseUid) {
      user.firebaseUid = decodedToken.uid;
      await user.save();
    }

    // Update last login time
    user.last_logged_in = new Date();
    await user.save();

    // Find stylist profile
    const stylistProfile = await StylistProfile.findOne({ userId: user._id });
    if (!stylistProfile) {
      return res.status(404).json({
        success: false,
        message: "Stylist profile not found. Please complete your profile setup.",
      });
    }

    // Generate tokens
    const tokenPayload = {
      id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      is_creator: user.is_creator,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Return user data and tokens
    const userResponse = {
      _id: user._id,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      is_creator: user.is_creator,
      address: user.address,
      createdAt: user.createdAt,
    };

    const stylistResponse = {
      _id: stylistProfile._id,
      stylistName: stylistProfile.stylistName,
      stylistEmail: stylistProfile.stylistEmail,
      stylistPhone: stylistProfile.stylistPhone,
      stylistImage: stylistProfile.stylistImage,
      stylistBio: stylistProfile.stylistBio,
      applicationStatus: stylistProfile.applicationStatus,
      approvalStatus: stylistProfile.approvalStatus,
      isApproved: stylistProfile.isApproved,
      bookingSettings: stylistProfile.bookingSettings,
    };

    return res.status(200).json({
      success: true,
      message: "Stylist login successful",
      user: userResponse,
      stylistProfile: stylistResponse,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Stylist login error:", error);
    return res.status(500).json({
      success: false,
      message: "Stylist login failed",
      error: error.message,
    });
  }
};
