import express from 'express';
import {
  getAllGroups,
  getActiveGroups,
  getGroupById,
  getGroupByPath,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupStats,
} from '../controllers/groupController.js';

const router = express.Router();

/**
 * GET /
 * Get all groups (admin view)
 */
router.get('/', getAllGroups);

/**
 * GET /active
 * Get active groups only (for dropdowns)
 */
router.get('/active', getActiveGroups);

/**
 * GET /by-path
 * Get group by basePath (for dynamic routing)
 */
router.get('/by-path', getGroupByPath);

/**
 * GET /stats
 * Get folder count statistics for groups
 */
router.get('/stats', getGroupStats);

/**
 * GET /:id
 * Get single group by ID
 */
router.get('/:id', getGroupById);

/**
 * POST /
 * Create a new group
 */
router.post('/', createGroup);

/**
 * PUT /:id
 * Update an existing group
 */
router.put('/:id', updateGroup);

/**
 * DELETE /:id
 * Delete a group
 */
router.delete('/:id', deleteGroup);

export default router;
