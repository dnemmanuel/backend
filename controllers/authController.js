import User from "../user/userModel.js";
import Role from "../models/roleModel.js";
import bcrypt from "bcrypt";
import { generateToken } from "../helpers/jwt.js";
import { logSystemEvent } from "./systemEventController.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username, and select the password and name fields
    const appUser = await User.findOne({ username }).select("+password username role firstName lastName");

    if (!appUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, appUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const roleId = appUser.role; // This is the ObjectId stored in the User document.

    if (!roleId) {
      // This handles cases where the role field is genuinely empty in the database
      console.error(
        `Login failed for user ${appUser.username}: Role ID is missing.`
      );
      return res
        .status(401)
        .json({ message: "Login failed: User role configuration error." });
    }

    // Fetch the Role and populate its Permissions using the correct _id.
    const userRole = await Role.findById(roleId) // <--- CORRECT: Query by _id
      .populate("permissions")
      .exec();

    if (!userRole) {
      // This is a safety check: if a user exists but their role does not, fail login.
      return res
        .status(401)
        .json({ message: "Login failed: User role configuration error." });
    }

    // Extract the array of permission keys (strings)
    console.log('🔐 Total permissions found:', userRole.permissions.length);
    console.log('🔐 First few permissions:', userRole.permissions.slice(0, 5));
    
    const permissionsKeys = userRole.permissions.map((p) => p.key);
    console.log('🔑 Permission keys:', permissionsKeys);

    // Payload for JWT
    const payload = {
      _id: appUser._id,
      username: appUser.username,
      role: appUser.role,
      ministry: appUser.ministry,
    };
    const token = generateToken(payload);

    // Log system event for successful login
    await logSystemEvent(appUser._id, appUser.username, `User logged in`);

    // --- CRITICAL CHANGE HERE: Include role and _id in the response ---
    res.json({
      message: "Login successful",
      token: token,
      role: userRole.name, // 💡 Include the user's role
      _id: appUser._id, // 💡 Include the user's ID
      username: appUser.username, // Include username
      firstName: appUser.firstName, // Include first name
      lastName: appUser.lastName, // Include last name
      permissions: permissionsKeys, // 💡 NEW: Include the permissions array
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  console.log('🚪 Logout endpoint hit');
  console.log('🔑 req.user:', req.user);
  
  // For JWT-based authentication, "logging out" is a client-side action
  // (deleting the token). The server only needs to confirm the request was received.
  
  // Log system event for logout if user is available
  if (req.user) {
    console.log(`📝 Logging system event for user: ${req.user.username}`);
    await logSystemEvent(req.user._id, req.user.username, `User logged out`);
  } else {
    console.log('❌ No req.user available - cannot log system event');
  }
  
  res.json({ message: "Logout successful" });
};
