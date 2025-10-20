import User from "../user/userModel.js";
import { validationResult } from "express-validator";
import { logSystemEvent } from "../controllers/systemEventController.js"; // Import the logger

/**
 * Creates a new user after passing validation and permission checks.
 */
export const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Destructure required fields
    const { username, password, role, email, firstName, lastName } = req.body;

    // Optional early check, though Mongoose validation should cover this
    if (!username || !password || !role || !email) {
      return res.status(400).json({
        message:
          "All required fields (username, password, role, email) are needed.",
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const newUser = new User({
      username,
      password: password,
      role,
      email,
      firstName,
      lastName,
      isActive: true, // Default to active
      lastLogin: null,
      // FIX: Removed "Default Ministry". Mongoose will now correctly throw a 
      // validation error if ministry is not provided in req.body.
      ministry: req.body.ministry, 
    });

    const savedUser = await newUser.save();
    
    // Populate role to get role name instead of ID
    await savedUser.populate('role', 'name');

    // Correctly log the system event after the user has been saved
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "Unknown";
    const roleName = savedUser.role?.name || savedUser.role;
    const action = `Created new user: ${savedUser.username} with role ${roleName}`;

    await logSystemEvent(performedBy, performedByName, action);

    // Respond with the saved user data, excluding the password
    res.status(201).json({
      message: "User created successfully",
      user: savedUser.toObject({ getters: true, virtuals: false }),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.name === "ValidationError") {
      console.error("Mongoose Validation Error Details:", error.errors);
      return res
        .status(400)
        .json({ message: error.message, details: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Updates an existing user based on ID.
 * Implements a whitelist to prevent Mass Assignment vulnerability.
 */
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // FIX: Implement whitelisting to prevent unauthorized changes to sensitive fields (Mass Assignment)
    const allowedUpdates = {};
    if (req.body.firstName !== undefined) allowedUpdates.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) allowedUpdates.lastName = req.body.lastName;
    if (req.body.email !== undefined) allowedUpdates.email = req.body.email;
    if (req.body.ministry !== undefined) allowedUpdates.ministry = req.body.ministry;
    // CRITICAL: DO NOT expose fields like 'role', 'password', or 'isActive' in this general update route.
    
    // Check if any fields were provided for update
    if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update." });
    }

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      allowedUpdates,
      { 
        new: true, 
        runValidators: true // Enforce Mongoose validation on updated fields (like ministry required)
      }
    ).select("-password"); // Exclude password from the returned object

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Log the system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "Unknown";
    const action = `Updated user: ${updatedUser.username}`;

    await logSystemEvent(performedBy, performedByName, action);

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.name === "ValidationError") {
      console.error("Mongoose Validation Error Details:", error.errors);
      return res
        .status(400)
        .json({ message: error.message, details: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Deletes a user based on ID.
 */
export const deleteUser = async (req, res) => {
  try {
    // First find the user to populate the role before deleting
    const userToDelete = await User.findById(req.params.id).populate('role', 'name');
    
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found." });
    }
    
    console.log('🔍 User role before delete:', userToDelete.role);
    console.log('🔍 Role is object?', typeof userToDelete.role);
    console.log('🔍 Role.name:', userToDelete.role?.name);
    
    // Now delete the user
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    // Log the system event with role name
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "Unknown";
    const roleName = (typeof userToDelete.role === 'object' && userToDelete.role?.name) 
      ? userToDelete.role.name 
      : String(userToDelete.role);
    const action = `Deleted user: ${deletedUser.username} with role ${roleName}`;
    
    console.log('📝 Logging event with role name:', roleName);

    await logSystemEvent(performedBy, performedByName, action);

    res.json({
      message: "User deleted successfully",
      user: deletedUser.username,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    if (error.name === "ValidationError") {
      console.error("Mongoose Validation Error Details:", error.errors);
      return res
        .status(400)
        .json({ message: error.message, details: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Fetches a list of all users.
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude password from results
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: error.message });
  }
};

/**
 * Fetches a single user by ID.
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid User ID format." });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};