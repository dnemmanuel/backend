import express from 'express';
import { login, logout } from '../controllers/authController.js'; // Import the controller functions
import { verifyToken } from '../middlewares/authMiddleware.js'; // Import authentication middleware

const router = express.Router();

router.post('/login', login);
router.post('/logout', verifyToken, logout); // Add verifyToken middleware to populate req.user

export default router;