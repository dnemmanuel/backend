import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import mongoose from "mongoose";
import { connectDB } from "./database/connect.js";
import { Env } from "./helpers/env.js";
import { verifyToken } from "./middlewares/authMiddleware.js";
import { checkPermission } from "./middlewares/checkPermission.js"; // 💡 NEW: Import the checkPermission middleware
import { seedSuperAdminUser } from "./database/seeders/s_adminSeeder.js";
import { seedPermissions } from "./database/seeders/permissionsSeeder.js"; // Ensure this path is correct

// --- Imports for Automated Folder Creation ---
import cron from "node-cron";
import { generateArchiveFoldersCore } from "./folder/folderController.js";
// --- End Folder Creation Imports ---

// --- IMPORTANT: Load ALL Mongoose models FIRST to ensure schemas are registered ---
import * as models from "./models/index.js";
// --- END IMPORTANT ---\

// Now import controllers and routes that use these models
import { createPdfUploadRouter } from "./routes/pdfUploadRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./user/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import folderRoutes from "./folder/folderRoutes.js";
import folderReadRoutes from "./folder/folderReadRoutes.js";
import { createUser } from "./user/userController.js";
import {
  getSystemEvents,
  logSystemEvent,
} from "./controllers/systemEventController.js";

// --- START DEBUGGING (Optional) ---
console.log(
  "Server.js startup: process.env.JWT_SECRET =",
  process.env.JWT_SECRET
);
// --- END DEBUGGING ---

// --- AUTOMATED CRON JOB SETUP ---

// Placeholder ID for Mongoose ObjectId fields when a System user performs an action
const SYSTEM_USER_ID = "000000000000000000000000";

const setupCronJobs = () => {
  // PRODUCTION CRON JOB: Runs at 2:00 AM on the 1st day of every month.
  // This job generates the payroll archive folder for the FOLLOWING month.
  // Cron string: '0 2 1 * *' (Minute 0, Hour 2, Day of Month 1, Every Month, Every Day of Week)
  cron.schedule(
    "34 23 * * *",
    async () => {
      const jobStartTime = new Date();
      console.log(
        `[Cron Job] Starting payroll folder generation at ${jobStartTime.toISOString()}`
      );

      // Log the start of the system job - now using SYSTEM_USER_ID
      if (typeof logSystemEvent === "function") {
        logSystemEvent(
          SYSTEM_USER_ID,
          "System Automated Job",
          "Starting scheduled payroll archive folder generation."
        );
      } else {
        console.warn(
          "logSystemEvent function not available. System event not logged."
        );
      }

      try {
        // Call the reusable core function, passing the SYSTEM_USER_ID
        const result = await generateArchiveFoldersCore(
          SYSTEM_USER_ID,
          "System Automated Job"
        );

        console.log(
          `[Cron Job] Payroll folder generation complete. Created: ${result.createdCount}, Skipped: ${result.skippedCount}`
        );

        // Log the successful completion
        if (typeof logSystemEvent === "function") {
          logSystemEvent(
            SYSTEM_USER_ID,
            "System Automated Job",
            `Successfully completed payroll folder generation. Created ${result.createdCount} folders.`
          );
        }
      } catch (error) {
        console.error(
          "[Cron Job] ERROR during payroll folder generation:",
          error
        );

        // Log the failure
        if (typeof logSystemEvent === "function") {
          logSystemEvent(
            SYSTEM_USER_ID,
            "System Automated Job",
            `FAILED to complete payroll folder generation: ${error.message}`
          );
        }
      }
    },
    {
      scheduled: true,
      timezone: "America/St_Lucia", // Use the appropriate timezone for your region (AST)
    }
  );

  console.log(
    "[Cron Job] Payroll Folder Generation scheduler is active (Production schedule: 2:00 AM on the 1st of every month)."
  );
};

// --- END AUTOMATED CRON JOB SETUP ---

connectDB()
  .then(async () => {
    console.log("Connected to MongoDB");

    // Run the seeder functions
    await seedPermissions();
    await seedSuperAdminUser();

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

    // User routes
    app.use("/users", verifyToken, userRoutes);

    // Role routes
    app.use("/roles", roleRoutes);

    // Permission routes
    app.use("/permissions", verifyToken, permissionRoutes);

    // Folder Read Route (Accessible to all authenticated users for reading)
    app.use("/api/folders", verifyToken, folderReadRoutes);

    // Folder Management Routes
    app.use(
      "/api/folders/manage",
      verifyToken,
      checkPermission("view_all_folders"),
      folderRoutes // Correct variable
    );

    // PDF Upload Route
    const pdfRouter = createPdfUploadRouter(mongoose.connection);
    app.use("/api/pdfs", verifyToken, pdfRouter);

    // System Events Route
    app.get(
      "/api/system-events",
      verifyToken,
      checkPermission("view_system_events"), // Requires 'view_system_events' permission
      getSystemEvents
    );

    // ------------------------------------------------------------------------------------------------

    app.use("/", (req, res) => {
      res.json("🚀🚀");
    });

    const PORT = Env.get("PORT", 3000);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Start the scheduled task once the server is ready
      setupCronJobs();
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });
