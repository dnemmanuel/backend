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
  checkPermission("create_users"), // CRITICAL: Only users with this permission can create
  createUserValidation, // Recommended: Add a validation middleware here
  createUser
);

// Get all users (List for User Manager)
router.get("/", verifyToken, checkPermission("view_all_users"), getAllUsers);

// Get user by ID (Detail view)
router.get(
  "/:id",
  verifyToken,
  checkPermission("view_all_users"),
  getUserById
);

// Update user (Note: Password and role changes should be carefully handled in the controller)
router.put(
  "/update/:id",
  verifyToken,
  checkPermission("edit_users"),
  updateUser
);

// Delete user
router.delete(
  "/delete/:id",
  verifyToken,
  checkPermission("delete_users"),
  deleteUser
);

export default router;
