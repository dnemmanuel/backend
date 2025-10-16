import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../user/userController.js'; // Import the controller functions

const router = express.Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/update/:id', updateUser);
router.delete('/delete/:id', deleteUser);

export default router;

// app.get('/admin-panel', authorize(['admin']), (req, res) => {
//   // ... admin panel logic
// });

// app.get('/edit-posts', authorize(['admin', 'editor']), (req, res) => {
//   // ... logic to edit posts
// });