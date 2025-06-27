import express from 'express';
import {
  getAllPermissions,
  createPermission,
  // updatePermission, // Uncomment if implementing update
  // deletePermission, // Uncomment if implementing delete
} from '../controllers/permissionController.js'; // Import permission controller functions

const router = express.Router();

// Routes for permission management
router.get('/', getAllPermissions); // Get all permissions
router.post('/', createPermission);       // Create a new permission

// Optional: Add routes for update and delete if implementing
// router.put('/:id', verifyToken, authorize(['super-admin']), updatePermission);
// router.delete('/:id', verifyToken, authorize(['super-admin']), deletePermission);

export default router;
