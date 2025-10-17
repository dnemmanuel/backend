// folderReadRoutes.js
import express from "express";
import {
  getAllFolders,
  getFoldersByGroup, // Ensure this is imported
  getFoldersByParentPath,
} from "./folderController.js"; // Use your existing controller

const router = express.Router();

/**
 * GET /group/:group
 * Fetches all active folders filtered by the 'group' path parameter.
 */
router.get("/group/:group", getFoldersByGroup);

/**
 * GET /parent
 * Fetches all active folders that are children of the specified parent path.
 * Query parameter: path (e.g., /api/folders/parent?path=/gosl-payroll/2025)
 */
router.get("/parent", getFoldersByParentPath);

/**
 * GET /active
 * Fetches all folders marked as isActive: true for general dashboard display.
 */
router.get("/active", getAllFolders);

export default router;
