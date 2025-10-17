import express from 'express';
import { 
    getAllPermissions, 
    createPermission, 
    updatePermission, 
    deletePermission 
} from '../controllers/permissionController.js';

// 💡 NEW IMPORTS: Authentication and Authorization middleware
import { verifyToken } from '../middlewares/authMiddleware.js'; 
import { checkPermission } from '../middlewares/checkPermission.js'; 

import { permissionValidation } from '../middlewares/permissionsValidation.js'; 

const router = express.Router();

// READ: Get list of all permissions (Needed for Role Manager)
router.get(
    '/', 
    verifyToken,
    checkPermission('view_permission_manager'), // Permission to view the list of all permissions
    getAllPermissions
);

// CREATE: Apply authorization and validation middleware
router.post(
    '/create', 
    verifyToken,
    checkPermission('create_permission'), // Permission to create new permissions
    permissionValidation, 
    createPermission
); 

// UPDATE: Apply authorization and validation middleware
router.put(
    '/update/:id', 
    verifyToken,
    checkPermission('edit_permission'), // Permission to edit existing permissions
    permissionValidation, 
    updatePermission
); 

// DELETE: Apply authorization middleware
router.delete(
    '/delete/:id', 
    verifyToken,
    checkPermission('delete_permission'), // Permission to delete permissions
    deletePermission
);

export default router;