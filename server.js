import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import mongoose from "mongoose";
import { connectDB } from "./database/connect.js";
import { Env } from "./helpers/env.js";
import { authorise, verifyToken } from "./middlewares/authMiddleware.js";
import { seedSuperAdminUser } from "./database/seeders/s_adminSeeder.js";

// --- Imports for Automated Folder Creation ---
import cron from 'node-cron';
import { generateArchiveFoldersCore } from "./folder/folderController.js"; // Path to the core logic
// --- End Folder Creation Imports ---

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
// UPDATED: Assuming logSystemEvent is available from this module for system logging
import { getSystemEvents, logSystemEvent } from "./controllers/systemEventController.js"; 

// --- ADD THIS LINE FOR DEBUGGING ---
console.log(
  "Server.js startup: process.env.JWT_SECRET =",
  process.env.JWT_SECRET
);
// --- END DEBUGGING ---


// --- AUTOMATED CRON JOB SETUP ---

// Placeholder ID for Mongoose ObjectId fields when a System user performs an action
const SYSTEM_USER_ID = '000000000000000000000000'; 

const setupCronJobs = () => {
    
    // PRODUCTION CRON JOB: Runs at 2:00 AM on the 1st day of every month.
    // This job generates the payroll archive folder for the FOLLOWING month.
    // Cron string: '0 2 1 * *' (Minute 0, Hour 2, Day of Month 1, Every Month, Every Day of Week)
    cron.schedule('0 2 1 * *', async () => { 
        const jobStartTime = new Date();
        console.log(`[Cron Job] Starting payroll folder generation at ${jobStartTime.toISOString()}`);
        
        // Log the start of the system job - now using SYSTEM_USER_ID
        if (typeof logSystemEvent === 'function') {
            logSystemEvent(SYSTEM_USER_ID, 'System Automated Job', 'Starting scheduled payroll archive folder generation.');
        } else {
            console.warn('logSystemEvent function not available. System event not logged.');
        }

        try {
            // Call the reusable core function, passing the SYSTEM_USER_ID
            const result = await generateArchiveFoldersCore(SYSTEM_USER_ID, 'System Automated Job');
            
            console.log(`[Cron Job] Payroll folder generation complete. Created: ${result.createdCount}, Skipped: ${result.skippedCount}`);
            
            // Log the successful completion
            if (typeof logSystemEvent === 'function') {
                logSystemEvent(SYSTEM_USER_ID, 'System Automated Job', 
                    `Successfully completed payroll folder generation. Created ${result.createdCount} folders.`
                );
            }
        } catch (error) {
            console.error('[Cron Job] ERROR during payroll folder generation:', error);
            
            // Log the failure
            if (typeof logSystemEvent === 'function') {
                logSystemEvent(SYSTEM_USER_ID, 'System Automated Job', 
                    `FAILED to complete payroll folder generation: ${error.message}`
                );
            }
        }
    }, {
        scheduled: true,
        timezone: "America/St_Lucia" // Use the appropriate timezone for your region (AST)
    });

    console.log("[Cron Job] Payroll Folder Generation scheduler is active (Production schedule: 2:00 AM on the 1st of every month).");
};

// --- END AUTOMATED CRON JOB SETUP ---


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

    // 2. Public Read Route (GET active, /group, /parent) - Accessible to all authenticated users
    // This assumes folderRoutes handles routes like /group and /parent that don't need 'authorise'
    app.use(
      "/api/folders",
      verifyToken,
      folderRoutes // This router handles the /active, /group, /parent routes
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
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        // 💡 CRON JOB START: Start the scheduled task once the server is ready
        setupCronJobs(); 
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });
