import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import mongoose from "mongoose"; // 💡 ADDED: Import Mongoose to access the connection object
import { connectDB } from "./database/connect.js";
import { Env } from "./helpers/env.js";
import { authorise, verifyToken } from "./middlewares/authMiddleware.js";
import { seedSuperAdminUser } from "./database/seeders/s_adminSeeder.js";

// --- IMPORTANT: Load ALL Mongoose models FIRST to ensure schemas are registered ---
// Importing models/index.js here ensures all model schemas are registered with Mongoose
// before any other part of the application attempts to use them.
import * as models from "./models/index.js";
// --- END IMPORTANT ---

// Now import controllers and routes that use these models
import { createPdfUploadRouter } from "./routes/pdfUploadRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./user/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import securityRequestRoutes from "./routes/securityRequestRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import folderRoutes from "./folder/folderRoutes.js";
import { createUser } from "./user/userController.js";
import { getSystemEvents } from "./controllers/systemEventController.js"; // Import getSystemEvents

// --- ADD THIS LINE FOR DEBUGGING ---
console.log(
  "Server.js startup: process.env.JWT_SECRET =",
  process.env.JWT_SECRET
);
// --- END DEBUGGING ---

connectDB()
  .then(() => {
    console.log("Connected to MongoDB");

    // Run the seeder functions
    seedSuperAdminUser();

    const app = express();

    // built in middlewares
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());

    // custom middlewares

    // Register ALL specific API routes FIRST.
    app.use("/auth", authRoutes);
    // The createUser route should be handled before the general /users route if it's publicly accessible
    app.post("/users/create", createUser);
    // User routes requiring token and authorization
    app.use("/users", verifyToken, authorise(["s-admin"]), userRoutes);
    app.use("/roles", verifyToken, authorise(["s-admin"]), roleRoutes);
    app.use(
      "/permissions",
      verifyToken,
      authorise(["s-admin"]),
      permissionRoutes
    );

    // 💡 NEW: Application/Dashboard Card Routes
    // 1. Management Routes (POST, PUT, DELETE, GET all) - Restricted to Admins
    app.use(
      "/api/folders/manage",
      verifyToken,
      authorise(["s-admin"]),
      folderRoutes // This router handles the non-suffixed routes (/, /:id)
    );

    // 2. Public Read Route (GET active) - Accessible to all authenticated users
    app.use(
      "/api/folders",
      verifyToken,
      folderRoutes // This router handles the /active route
    );

    // 🚀 CORRECTED:
    // 1. Initialize the router using the active Mongoose connection.
    const pdfRouter = createPdfUploadRouter(mongoose.connection);

    // 2. Register the initialized router instance (pdfRouter) as middleware.
    app.use(
      "/api/pdfs",
      verifyToken,
      authorise(["s-admin"]), // Adjusted roles for broader access
      pdfRouter
    );

    // Route for fetching system events
    // Ensure this route has appropriate authentication and authorization
    app.get(
      "/api/system-events",
      verifyToken,
      authorise(["s-admin"]),
      getSystemEvents
    );

    // General /api routes
    // Ensure more specific routes come before broader ones if using the same prefix
    app.use(
      "/api",
      verifyToken,
      // authorise(["admin", "s-admin", "lvl-1"]), // Uncomment and adjust as needed
      securityRequestRoutes
    );

    app.use("/", (req, res) => {
      res.json("🚀🚀");
    });

    const PORT = Env.get("PORT", 3000);
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });
