import express from "express";
import {
  getAllFolders,
  getAllFoldersAdmin,
  createFolder,
  updateFolder,
  deleteFolder,
  getFoldersByGroup,
  bulkUpdateSortOrder,
} from "../folder/folderController.js";

// The authMiddleware (verifyToken, authorise) is assumed to be handled
// in the main server.js file before this router is mounted.
const router = express.Router();
// --- Admin/Management Routes (s-admin and admin only) ---

/**
 * GET /
 * Fetches all folders (active and inactive) for the administrative panel.
 */
router.get("/", getAllFoldersAdmin);

/**
 * POST /
 * Creates a new folder card.
 */
router.post("/", createFolder);

/**
 * PUT /reorder
 * Bulk update sortOrder for multiple folders
 * IMPORTANT: Must be before /:id route to avoid matching "reorder" as an ID
 */
router.put("/reorder", bulkUpdateSortOrder);

/**
 * PUT /:id
 * Updates an existing folder card by its ID.
 */
router.put("/:id", updateFolder);

/**
 * DELETE /:id
 * Deletes a folder card by its ID.
 */
router.delete("/:id", deleteFolder);

export default router;
