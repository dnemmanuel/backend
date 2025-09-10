// securityRequestRoutes.js

import express from "express";
import { verifyToken, authorise } from "../middlewares/authMiddleware.js";
import {
  submitSecurityRequest,
  getSecurityRequests,
  updateSecurityRequestStatus,
  getSecurityRequestById,
  deleteSecurityRequest,
} from "../controllers/securityRequestController.js";

const router = express.Router();

// Route for submitting new security requests
router.post("/security-requests", verifyToken, submitSecurityRequest);

// Correct order: verifyToken before authorise
router.get(
  "/security-requests",
  verifyToken, // Moved to the correct position
  authorise(["admin", "s-admin", "lvl-2", "lvl-3", "HCM-Officer"]),
  getSecurityRequests
);

// Route for updating the status of a security request by ID
router.patch(
  "/security-requests/:id/status",
  verifyToken,
  authorise(["admin", "s-admin", "lvl-2", "lvl-3", "HCM-Officer"]),
  updateSecurityRequestStatus
);

// Route for getting a single security request by ID
router.get(
  "/security-requests/:id",
  verifyToken,
  authorise(["admin", "s-admin", "lvl-2", "lvl-3", "HCM-Officer"]),
  getSecurityRequestById
);

router.delete(
  "/security-requests/delete/:id",
  verifyToken,
  authorise(["admin", "s-admin"]),
  deleteSecurityRequest
);

export default router;