// routes/roleRoutes.js

import express from 'express';
import {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
} from '../controllers/roleController.js';

// 💡 NEW: Import the necessary middleware
import { verifyToken } from '../middlewares/authMiddleware.js'; 
import { checkPermission } from '../middlewares/checkPermission.js'; 

const router = express.Router();

// Get all roles (Permission needed to view the manager)
router.get(
    '/', 
    verifyToken,
    checkPermission('view_roles'), 
    getAllRoles
);

// Get role by ID
router.get(
    '/:id', 
    verifyToken, 
    checkPermission('view_roles'), 
    getRoleById
);

// Create a new role
router.post(
    '/create', 
    verifyToken, 
    checkPermission('define_roles'), // Requires 'create_role' permission
    createRole
);

// Update role (Assuming the ID is passed in the route parameter)
router.put(
    '/update/:id', 
    verifyToken,
    checkPermission('modify_roles'), // Requires 'edit_role' permission
    updateRole
);

// Delete role (Assuming the ID is passed in the route parameter)
router.delete(
    '/delete/:id', 
    verifyToken, 
    checkPermission('delete_roles'), // Requires 'delete_role' permission
    deleteRole
);

export default router;