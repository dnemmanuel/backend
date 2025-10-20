import Permission from "../models/permissionModel.js";
import Role from "../models/roleModel.js"; // 👈 NEW: Import the Role model
import { validationResult } from "express-validator";
import { logSystemEvent } from "./systemEventController.js";

// GET: Get all permissions (no change)
export const getAllPermissions = async (req, res) => {
  try {
    // Fetch all permissions, sorting by name for a cleaner UI list
    const permissions = await Permission.find().sort({ name: 1 });

    const simplifiedPermissions = permissions.map((p) => ({
      _id: p._id,
      name: p.name,
      key: p.key,
      description: p.description,
    }));

    res.status(200).json(simplifiedPermissions);
  } catch (error) {
    console.error("Error fetching all permissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST: Create a new permission (no change to core logic)
export const createPermission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { key, name, description } = req.body;

    const existingPermission = await Permission.findOne({ key });
    if (existingPermission) {
      return res
        .status(400)
        .json({ message: "Permission key already exists." });
    }

    const newPermission = new Permission({ key, name, description });
    await newPermission.save();
    
    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    logSystemEvent(performedBy, performedByName, `Created permission: ${newPermission.name} (${newPermission.key})`);
    
    res.status(201).json(newPermission);
  } catch (error) {
    console.error("Error creating permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PUT: Update an existing permission (no change to core logic)
export const updatePermission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { key, name, description } = req.body;

    const existingPermission = await Permission.findOne({ key });
    if (
      existingPermission &&
      existingPermission._id.toString() !== req.params.id
    ) {
      return res
        .status(400)
        .json({
          message: "Permission key already exists for another permission.",
        });
    }

    const updatedPermission = await Permission.findByIdAndUpdate(
      req.params.id,
      { key, name, description },
      { new: true }
    ).select("key name description");

    if (!updatedPermission) {
      return res.status(404).json({ message: "Permission not found" });
    }
    
    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    logSystemEvent(performedBy, performedByName, `Updated permission: ${updatedPermission.name} (${updatedPermission.key})`);
    
    res.json(updatedPermission);
  } catch (error) {
    console.error("Error updating permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE: Delete a permission
export const deletePermission = async (req, res) => {
  const permissionId = req.params.id;

  try {
    // 1. Delete the Permission record itself
    const deletedPermission = await Permission.findByIdAndDelete(permissionId);

    if (!deletedPermission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    // 2. CRITICAL FOLLOW-UP: Remove the deleted permission's ID from all Roles
    // The $pull operator removes all instances of a value from an array.
    const updateResult = await Role.updateMany(
      { permissions: permissionId }, // Query: Find all documents (Roles) that contain this ID
      { $pull: { permissions: permissionId } } // Update: Remove the ID from the permissions array
    );

    console.log(
      `Permission ${permissionId} removed from ${updateResult.modifiedCount} role(s).`
    );

    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    logSystemEvent(performedBy, performedByName, `Deleted permission: ${deletedPermission.name} (${deletedPermission.key}) - removed from ${updateResult.modifiedCount} role(s)`);
    
    res.json({
      message:
        "Permission deleted successfully and removed from all associated roles.",
      rolesUpdated: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Error deleting permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
