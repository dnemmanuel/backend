import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} from "../user/userController.js";

// 💡 CRITICAL: Import the necessary middleware
import { verifyToken } from "../middlewares/authMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";
import { createUserValidation } from '../middlewares/userValidation.js';

const router = express.Router();

// Create a new user
router.post(
  "/",
  verifyToken,
  checkPermission("create_user"), // CRITICAL: Only users with this permission can create
  createUserValidation, // Recommended: Add a validation middleware here
  createUser
);

// Get all users (List for User Manager)
router.get("/", verifyToken, checkPermission("view_user_manager"), getAllUsers);

// Get user by ID (Detail view)
router.get(
  "/:id",
  verifyToken,
  checkPermission("view_user_manager"),
  getUserById
);

// Update user (Note: Password and role changes should be carefully handled in the controller)
router.put(
  "/update/:id",
  verifyToken,
  checkPermission("edit_user"),
  updateUser
);

// Delete user
router.delete(
  "/delete/:id",
  verifyToken,
  checkPermission("delete_user"),
  deleteUser
);

export default router;
