import User from '../models/userModel.js'; // Ensure this path and export name are correct
import { validationResult } from 'express-validator';
// No need to import bcrypt here, as hashing is handled by the model's pre('save') hook

export const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, role, email, firstName, lastName } = req.body; 

    if (!username || !password || !role || !email) { 
      return res.status(400).json({ message: 'All required fields (username, password, role, email) are needed.' });
    }

    const existingUser = await User.findOne({ username }); 
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    // Password hashing will be handled by the pre('save') hook in userModel.js
    const newUser = new User({ 
      username,
      password: password, 
      role,
      email,        
      firstName,    
      lastName,     
      isActive: true, 
      lastLogin: null 
    });

    const savedUser = await newUser.save(); // Hashing happens here via pre('save') hook
    const { password: _, ...rest } = savedUser.toJSON();
    res.status(201).json({ message: 'User created successfully', user: rest }); 
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.name === 'ValidationError') {
      console.error('Mongoose Validation Error Details:', error.errors);
      return res.status(400).json({ message: error.message, details: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); 
    res.json(users);
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); 
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Destructure password from req.body as well
    const { username, role, email, firstName, lastName, isActive, password } = req.body;
    const userId = req.params.id;

    // Find the user by ID first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the username is already taken by another user (excluding the current user)
    const existingUserWithUsername = await User.findOne({ username, _id: { $ne: userId } }); 
    if (existingUserWithUsername) {
      return res.status(400).json({ message: "Username already taken by another user." });
    }

    // Check if the email is already taken by another user (excluding the current user)
    const existingUserWithEmail = await User.findOne({ email, _id: { $ne: userId } }); 
    if (existingUserWithEmail) {
      return res.status(400).json({ message: "Email already taken by another user." });
    }

    // Update user fields directly on the Mongoose document
    user.username = username;
    user.role = role;
    user.email = email;
    user.firstName = firstName;
    user.lastName = lastName;
    user.isActive = isActive;

    // Handle password update ONLY if a new password is provided in the request body
    // If a password is provided, assign it. The pre('save') hook in userModel.js
    // will automatically hash it before saving.
    if (password) {
      user.password = password;
    }

    // Save the user document. This will trigger the pre('save') hook for password hashing
    // if user.password was modified.
    const updatedUser = await user.save({ validateBeforeSave: true }); 
    
    // Exclude password from the response
    const { password: _, ...rest } = updatedUser.toJSON();
    res.json({ message: 'User updated successfully', user: rest }); 
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.name === 'ValidationError') {
      console.error('Mongoose Validation Error Details:', error.errors);
      return res.status(400).json({ message: error.message, details: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userIdToDelete = req.params.id; 

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToDelete.role === 's-admin') { // Using 's-admin' as per enum
      const superAdminsCount = await User.countDocuments({ role: 's-admin' });
      if (superAdminsCount <= 1) {
        return res.status(403).json({ message: 'Cannot delete the last super-admin user. At least one super-admin must remain.' });
      }
    }

    const deletedUser = await User.findByIdAndDelete(userIdToDelete); 
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found after check.' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
