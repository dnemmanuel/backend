import User from "../user/userModel.js";
import { validationResult } from "express-validator";
import { logSystemEvent } from "../controllers/systemEventController.js"; // Import the logger

export const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, role, email, firstName, lastName } = req.body;

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
      isActive: true,
      lastLogin: null,
      ministry: req.body.ministry || "Default Ministry", // Ensure ministry is set or default
    });

    const savedUser = await newUser.save();

    // Correctly log the system event after the user has been saved
    const performedBy = req.user ? req.user._id : null;
    const performedByName = req.user ? req.user.username : "Unknown";
    const action = `Created user: ${savedUser.username} with role ${savedUser.role}`;

    logSystemEvent(performedBy, performedByName, action);

    const { password: _, ...rest } = savedUser.toJSON();
    res.status(201).json({ message: "User created successfully", user: rest });
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

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Apply all updates from the request body to the user document
    for (const key in updates) {
      // Skip ID field just in case
      if (key !== "_id" && updates[key] !== undefined) {
        // If the password is provided and is a non-empty string, it will be set.
        // Mongoose will internally track that 'password' has been modified.
        user[key] = updates[key];
      }
    }

    // Calling user.save() ensures the pre('save') hook in userModel.js runs,
    // which checks if the password was modified and hashes it if necessary.
    const updatedUser = await user.save();

    // Log the system event
    const performedBy = req.user ? req.user.userId : "System";
    const performedByName = req.user ? req.user.username : "System";
    const action = `Updated user account: ${updatedUser.username}`;

    logSystemEvent(performedBy, performedByName, action);

    // Respond, excluding the password
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json({
      message: "User updated successfully",
      user: userResponse,
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

export const deleteUser = async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToDelete.role === "s-admin") {
      const superAdminsCount = await User.countDocuments({ role: "s-admin" });
      if (superAdminsCount <= 1) {
        return res.status(403).json({
          message:
            "Cannot delete the last super-admin user. At least one super-admin must remain.",
        });
      }
    }

    const deletedUser = await User.findByIdAndDelete(userIdToDelete);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found after check (possible race condition).",
      });
    }

    // Correctly log the system event after the user has been deleted
    const performedBy = req.user ? req.user._id : null;
    const performedByName = req.user ? req.user.username : "Unknown";
    const action = `Deleted user: ${deletedUser.username} with role ${deletedUser.role}`;

    logSystemEvent(performedBy, performedByName, action);

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

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: error.message });
  }
};
