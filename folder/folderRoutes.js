import express from 'express';
import { 
    getAllFolders, 
    getAllFoldersAdmin,
    createFolder, 
    updateFolder, 
    deleteFolder,
    getFoldersByGroup // ADDED: Import the new controller function
} from '../folder/folderController.js';

// The authMiddleware (verifyToken, authorise) is assumed to be handled 
// in the main server.js file before this router is mounted.
const router = express.Router();

// --- Public/General Access Routes (for dashboard population) ---
// Note: This route will be accessible to all verified users (handled in server.js)
router.get('/active', getAllFolders);

// NEW: Route to fetch active folders filtered by a specific group
router.get('/group/:group', getFoldersByGroup); 

// --- Admin/Management Routes (s-admin and admin only) ---
// Use admin controller method to fetch all Folders (including inactive)
router.get('/', getAllFoldersAdmin); 
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export default router;
