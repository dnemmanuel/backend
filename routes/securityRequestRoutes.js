import express from "express";
// Ensure verifyToken and authorise are imported
import { verifyToken, authorise } from "../middlewares/authMiddleware.js"; // Assuming this path
import {
  submitSecurityRequest,
  getSecurityRequests,
  updateSecurityRequestStatus,
  getSecurityRequestById,
} from "../controllers/securityRequestController.js";

const router = express.Router();

// Route for submitting new security requests
router.post("/security-requests", verifyToken, submitSecurityRequest);

// Route for getting all security requests
router.get(
  "/security-requests",
  authorise(["admin", "s-admin"]),
  verifyToken,
  getSecurityRequests
);

// Route for updating the status of a security request by ID
router.patch(
  "/security-requests/:id/status",
  verifyToken,
  authorise(["admin", "s-admin"]),
  updateSecurityRequestStatus
);

// Route for getting a single security request by ID
router.get(
  "/security-requests/:id",
  verifyToken,
  authorise(["admin", "s-admin"]),
  getSecurityRequestById
);

export default router;
