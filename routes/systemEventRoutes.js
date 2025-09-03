// In systemEventRoutes.js
import express from "express";
import { getSystemEvents } from "../controllers/systemEventController.js";
import { verifyToken, authorise } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, authorise(["s-admin", "admin"]), getSystemEvents);

export default router;
