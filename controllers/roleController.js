import Role from "../models/roleModel.js"; // Import the Role model
import { validationResult } from "express-validator"; // Import validationResult
import { logSystemEvent } from "./systemEventController.js";

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    console.error("Error getting all roles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get role by ID
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.json(role);
  } catch (error) {
    console.error("Error getting role by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new role
export const createRole = async (req, res) => {
  // ... (validationResult)

  try {
    // UPDATED: Destructure permissions as well
    const { name, description, permissions } = req.body;

    // Check if the role name is already taken
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: "Role Name already taken" });
    }

    // Create the new role, including the permissions array
    const newRole = new Role({
      name,
      description,
      permissions: permissions || [], // Use provided permissions or an empty array
    });

    await newRole.save();
    
    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    logSystemEvent(performedBy, performedByName, `Created role: ${newRole.name}`);
    
    res.status(201).json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update role
export const updateRole = async (req, res) => {
  // ... (validationResult)

  try {
    // UPDATED: Destructure permissions as well
    const { name, description, permissions } = req.body;
    // Check if the role name is already taken by another role
    // ... (existing logic to check for existingRole with same name but different ID)

    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      // UPDATED: Include permissions in the update object
      { name, description, permissions: permissions || [] },
      { new: true }
    );
    // ... (existing logic for not found and response)
    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found" });
    }
    
    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    logSystemEvent(performedBy, performedByName, `Updated role: ${updatedRole.name}`);
    
    res.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const deletedRole = await Role.findByIdAndDelete(req.params.id);
    if (!deletedRole) {
      return res.status(404).json({ message: "Role not found" });
    }
    
    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    await logSystemEvent(performedBy, performedByName, `Deleted role: ${deletedRole.name}`);
    
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
