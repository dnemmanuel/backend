import Role from '../models/roleModel.js'; // Import the Role model
import { validationResult } from 'express-validator'; // Import validationResult

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    console.error('Error getting all roles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get role by ID
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    console.error('Error getting role by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new role
export const createRole = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description } = req.body;

    // Check if the role name is already taken
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: 'Role name already taken' });
    }

    // Create the new role
    const newRole = new Role({
      name,
      description,
    });
    const savedRole = await newRole.save();
    res.status(201).json(savedRole);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update role
export const updateRole = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, description } = req.body;
     // Check if the role name is already taken by another role
    const existingRole = await Role.findOne({ name });
    if (existingRole && existingRole._id.toString() !== req.params.id) {
      return res.status(400).json({ message: 'Role Name already taken' });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!updatedRole) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(updatedRole);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const deletedRole = await Role.findByIdAndDelete(req.params.id);
    if (!deletedRole) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
