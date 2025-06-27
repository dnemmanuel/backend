import User from '../models/userModel.js'; // CORRECTED: Assuming your model export is 'User'
import { validationResult } from 'express-validator'; // ADDED: Import validationResult

export const createUser = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, role, email, firstName, lastName } = req.body; // Added email, firstName, lastName

    // Basic validation (can be enhanced with express-validator middleware on the route)
    if (!username || !password || !role || !email) { // Email now required
      return res.status(400).json({ message: 'All required fields (username, password, role, email) are needed.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username }); // CORRECTED: Use User model
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    // Password hashing will be handled by the pre('save') hook in userModel.js
    const newUser = new User({ // CORRECTED: Use User model
      username,
      password: password, // CORRECTED: Pass plain password, model hook will hash it
      role,
      email,        // Added
      firstName,    // Added
      lastName,     // Added
      isActive: true, // Default to true
      lastLogin: null // Default to null
    });

    const savedUser = await newUser.save(); // Hashing happens here via pre('save') hook
    // Exclude password from the response
    const { password: _, ...rest } = savedUser.toJSON();
    res.status(201).json({ message: 'User created successfully', user: rest }); // Added user object to response
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // CORRECTED: Use User model
    res.json(users);
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // CORRECTED: Use User model
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, role, email, firstName, lastName, isActive } = req.body; // Added fields
    const userId = req.params.id;

    // Check if the username is already taken by another user
    const existingUserWithUsername = await User.findOne({ username }); // CORRECTED: Use User model
    if (existingUserWithUsername && existingUserWithUsername._id.toString() !== userId) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Check if the email is already taken by another user
    const existingUserWithEmail = await User.findOne({ email }); // CORRECTED: Use User model
    if (existingUserWithEmail && existingUserWithEmail._id.toString() !== userId) {
      return res.status(400).json({ message: "Email already taken" });
    }

    // Build update object dynamically
    const updateFields = { username, role, email, firstName, lastName, isActive };

    const updatedUser = await User.findByIdAndUpdate( // CORRECTED: Use User model
      userId,
      updateFields,
      { new: true, runValidators: true } // 'new: true' returns the updated document, 'runValidators' runs schema validators
    ).select('-password'); // CORRECTED: Exclude password from response

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: 'User updated successfully', user: updatedUser }); // Added user object to response
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id; // Get ID from params
    const deletedUser = await User.findByIdAndDelete(userId); // CORRECTED: Use User model, renamed variable
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
