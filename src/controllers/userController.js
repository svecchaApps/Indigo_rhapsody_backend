const User = require("../models/userModel");
const Designer = require("../models/designerModel");
const { bucket } = require("../service/firebaseServices");
const { admin } = require("../service/firebaseServices");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const {
      email,
      displayName,
      phoneNumber,
      password,
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const newUser = new User({
      email,
      displayName,
      phoneNumber,
      password,
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
    });

    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body; // Accept updates dynamically

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const filters = req.query;
    const users = await User.find(filters);

    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Controller to create User and Designer
exports.createUserAndDesigner = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const {
      email,
      password,
      displayName,
      phoneNumber,
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
      shortDescription,
      about,
      logoUrl, // Logo URL passed in body
      backgroundImageUrl, // Background image URL passed in body
    } = req.body;

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Step 1: Create Firebase Auth User
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName,
      phoneNumber,
    });

    console.log("Firebase user created:", firebaseUser.uid);

    // Step 2: Create MongoDB User
    const newUser = new User({
      email,
      displayName,
      phoneNumber,
      password, // You may choose to hash this before storing.
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
      firebaseUid: firebaseUser.uid, // Store Firebase UID for reference
    });

    await newUser.save({ session });

    // Step 3: Create Designer Document using the image URLs from the request body
    const newDesigner = new Designer({
      userId: newUser._id,
      logoUrl: logoUrl || null, // Use provided logo URL or null
      backGroundImage: backgroundImageUrl || null, // Use provided background image URL or null
      shortDescription,
      about,
    });

    await newDesigner.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "User and Designer created successfully",
      user: newUser,
      designer: newDesigner,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating user and designer:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.loginDesigner = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Step 2: Check if the user's role is "Designer"
    if (user.role !== "Designer") {
      return res.status(403).json({ message: "Access denied. Not a designer" });
    }

    // Step 3: Validate the password (plain text comparison)
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Step 4: Find the associated designer record
    const designer = await Designer.findOne({ userId: user._id });
    if (!designer) {
      return res.status(404).json({ message: "Designer profile not found" });
    }

    // Step 5: Generate a token (optional)
  

    // Step 6: Return userId, designerId, and token
    res.status(200).json({
      message: "Login successful",
      userId: user._id,
      designerId: designer._id,
   
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
