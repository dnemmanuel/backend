import Permission from '../models/permissionModel.js'; // Import the Permission model
import { validationResult } from 'express-validator'; // Import validationResult

// Get all permissions
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (error) {
    console.error('Error getting all permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new permission
export const createPermission = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description } = req.body;

    // Check if the permission name is already taken
    const existingPermission = await Permission.findOne({ name });
    if (existingPermission) {
      return res.status(400).json({ message: 'Permission name already exists' });
    }

    // Create the new permission
    const newPermission = new Permission({
      name,
      description,
    });
    const savedPermission = await newPermission.save();
    res.status(201).json(savedPermission);
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Optional: Implement update and delete if needed later
// export const updatePermission = async (req, res) => { /* ... */ };
// export const deletePermission = async (req, res) => { /* ... */ };
