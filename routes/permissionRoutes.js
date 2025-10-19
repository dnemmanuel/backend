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
    checkPermission('view_all_permissions'), // Permission to view the list of all permissions
    getAllPermissions
);

// CREATE: Apply authorization and validation middleware
router.post(
    '/create', 
    verifyToken,
    checkPermission('define_permissions'), // Permission to create new permissions
    permissionValidation, 
    createPermission
); 

// UPDATE: Apply authorization and validation middleware
router.put(
    '/update/:id', 
    verifyToken,
    checkPermission('modify_permissions'), // Permission to edit existing permissions
    permissionValidation, 
    updatePermission
); 

// DELETE: Apply authorization middleware
router.delete(
    '/delete/:id', 
    verifyToken,
    checkPermission('delete_permissions'), // Permission to delete permissions
    deletePermission
);

export default router;